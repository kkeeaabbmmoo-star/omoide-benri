#!/usr/bin/env python3
"""Add/replace a published profile photo for a member (never deletes other slots).

  python3 tools/set_profile_photo.py 恵 /path/to.jpg [--slot 0] [--push]
  python3 tools/set_profile_photo.py ゆず shot.png --slot 3 --push
  python3 tools/set_profile_photo.py --limits

Limits: tools/photo_limits.py (エイジ/ゆず=10, others=4).
Writes data/profile_photos/<name>_<slot>.jpg and updates profiles.json photos[].
"""
from __future__ import annotations
import argparse, datetime, json, os, re, shutil, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from photo_limits import photo_limit, PHOTO_LIMIT, DEFAULT_LIMIT

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROF = os.path.join(D, 'data', 'profiles.json')
OUT = os.path.join(D, 'data', 'profile_photos')

def jst():
  return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')

def plain(w):
  return re.sub(r'[^\w・ー]', '', w) or w

def load():
  return json.load(open(PROF, encoding='utf-8'))

def save(data):
  bk = PROF + '.bak_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
  shutil.copy2(PROF, bk)
  print('backup', bk)
  data['updated'] = jst()
  tmp = PROF + '.tmp'
  with open(tmp, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
    f.write('\n')
  os.replace(tmp, PROF)

def to_jpeg(src, dest, size=480):
  from PIL import Image
  im = Image.open(src).convert('RGB')
  s = min(im.size)
  left = (im.width - s) // 2
  top = (im.height - s) // 2
  im = im.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)
  os.makedirs(os.path.dirname(dest), exist_ok=True)
  im.save(dest, 'JPEG', quality=80, optimize=True)

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('who', nargs='?')
  ap.add_argument('image', nargs='?')
  ap.add_argument('--slot', type=int, default=None, help='0-based; default=first empty or 0')
  ap.add_argument('--push', action='store_true')
  ap.add_argument('--limits', action='store_true')
  ap.add_argument('--no-backup', action='store_true')
  args = ap.parse_args()
  if args.limits:
    print('DEFAULT', DEFAULT_LIMIT)
    for k, v in sorted(PHOTO_LIMIT.items()):
      print(k, v)
    return
  if not args.who or not args.image:
    ap.print_help(); sys.exit(2)
  if not os.path.isfile(args.image):
    sys.exit('image not found: ' + args.image)
  data = load()
  mid = args.who if args.who in data['members'] else plain(args.who)
  if mid not in data['members']:
    # try resolve
    for k, m in data['members'].items():
      if m.get('display') == args.who or plain(k) == plain(args.who):
        mid = k; break
  if mid not in data['members']:
    sys.exit('unknown member: ' + args.who)
  lim = photo_limit(mid)
  photos = list(data['members'][mid].get('photos') or [])
  while len(photos) < lim:
    photos.append('')
  photos = photos[:lim]
  slot = args.slot
  if slot is None:
    slot = next((i for i, p in enumerate(photos) if not p), 0)
  if not (0 <= slot < lim):
    sys.exit(f'slot must be 0..{lim-1} for {mid} (limit {lim})')
  safe = re.sub(r'[^\w・ー\-]', '_', mid)
  rel = f'data/profile_photos/{safe}_{slot}.jpg'
  dest = os.path.join(D, rel)
  to_jpeg(args.image, dest)
  photos[slot] = rel
  # trim trailing empties for cleanliness but keep index holes as ''
  data['members'][mid]['photos'] = photos
  if not args.no_backup:
    save(data)
  else:
    data['updated'] = jst()
    json.dump(data, open(PROF, 'w'), ensure_ascii=False, indent=1)
  print('wrote', rel, 'slot', slot, 'limit', lim)
  cmd = ['python3', os.path.join(D, 'build.py')] + (['--push'] if args.push else [])
  subprocess.run(cmd, check=True)

if __name__ == '__main__':
  main()
