#!/usr/bin/env python3
"""Update a member's profile fields / look in data/profiles.json (never deletes).

Examples:
  python3 tools/set_profile.py 恵 --年齢 27歳 --職業 パティシエ --性格 あたたかい
  python3 tools/set_profile.py 由紀 --look-theme '#ff69b4' --look-font maru --look-tone 'ギャル口調'
  python3 tools/set_profile.py まい --写真 img/avatars/mai.png --clear-仮
  python3 tools/set_profile.py --list
"""
from __future__ import annotations
import argparse, datetime, json, os, re, shutil, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(D, 'data', 'profiles.json')
FIELDS = ['名前', '年齢', '職業', '性格', '趣味', '最近気になること', '嫌いな食べ物']
LOOK_KEYS = {
    'theme': 'theme',
    'background': 'background',
    'font': 'font',
    'decoration': 'decoration',
    'photo': 'photo',
    'icon': 'icon',
    'tone': 'tone',
}

def jst_now():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')

def load():
    if not os.path.exists(PATH):
        raise SystemExit('missing ' + PATH)
    return json.load(open(PATH, encoding='utf-8'))

def save(data, backup=True):
    if backup and os.path.exists(PATH):
        bk = PATH + '.bak_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        shutil.copy2(PATH, bk)
        print('backup', bk)
    data['updated'] = jst_now()
    # write via temp then replace — never truncate on failure
    tmp = PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, PATH)
    print('saved', PATH, 'updated', data['updated'])

def resolve_id(data, who: str) -> str:
    who = who.strip()
    members = data.get('members') or {}
    if who in members:
        return who
    plain = re.sub(r'[^\w・ー]', '', who) or who
    if plain in members:
        return plain
    for k, m in members.items():
        if m.get('display') == who or (m.get('fields') or {}).get('名前') == who:
            return k
        if re.sub(r'[^\w・ー]', '', str(m.get('display') or '')) == plain:
            return k
    raise SystemExit(f'unknown member: {who!r}. known: {", ".join(data.get("order") or members)}')

def main():
    ap = argparse.ArgumentParser(description='Update omoide-benri member profile (merge, never delete)')
    ap.add_argument('who', nargs='?', help='member id / display name')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--json', action='store_true', help='print member JSON after update / with --list all')
    ap.add_argument('--clear-仮', dest='clear_kari', action='store_true',
                    help='drop provisional flags for fields you set (mark as本人確定)')
    ap.add_argument('--display', help='display name on card')
    # fields
    for f in FIELDS:
        ap.add_argument(f'--{f}', dest=f'f_{f}')
    # look
    ap.add_argument('--look-theme')
    ap.add_argument('--look-background')
    ap.add_argument('--look-font', choices=['maru', 'sans', 'serif'])
    ap.add_argument('--look-decoration')
    ap.add_argument('--look-photo', '--写真', dest='look_photo')
    ap.add_argument('--look-icon')
    ap.add_argument('--look-tone')
    ap.add_argument('--reward-add', action='append', default=[], help='append reward item id (keep forever)')
    ap.add_argument('--no-backup', action='store_true')
    args = ap.parse_args()
    data = load()

    if args.list:
        for k in data.get('order') or (data.get('members') or {}):
            m = data['members'][k]
            f = m.get('fields') or {}
            print(f"{k}\t{f.get('年齢','?')}\t{f.get('職業','?')}")
        if args.json:
            print(json.dumps(data, ensure_ascii=False, indent=1))
        return

    if not args.who:
        ap.print_help(); sys.exit(2)

    mid = resolve_id(data, args.who)
    m = data['members'].setdefault(mid, {'display': mid, 'fields': {}, 'provisional': [], 'look': {}})
    m.setdefault('fields', {})
    m.setdefault('look', {})
    m.setdefault('provisional', [])
    if mid not in (data.get('order') or []):
        data.setdefault('order', []).append(mid)

    changed = []
    if args.display:
        m['display'] = args.display
        changed.append('display')

    for f in FIELDS:
        v = getattr(args, f'f_{f}', None)
        if v is None:
            continue
        m['fields'][f] = v
        changed.append(f)
        if args.clear_kari:
            m['provisional'] = [x for x in m['provisional'] if x != f]
        # strip leading 仮 markers if user sent clean value via clear
        if args.clear_kari and f in m.get('provisional', []):
            pass

    look_map = {
        'theme': args.look_theme,
        'background': args.look_background,
        'font': args.look_font,
        'decoration': args.look_decoration,
        'photo': args.look_photo,
        'icon': args.look_icon,
        'tone': args.look_tone,
    }
    for k, v in look_map.items():
        if v is None:
            continue
        m['look'][k] = v
        changed.append('look.' + k)

    if args.reward_add:
        items = m['look'].setdefault('rewardItems', [])
        for rid in args.reward_add:
            if rid not in items:
                items.append(rid)
                changed.append('reward+' + rid)

    if not changed:
        print('nothing to change; current:')
        print(json.dumps(m, ensure_ascii=False, indent=1))
        return

    save(data, backup=not args.no_backup)
    print('member', mid, 'changed', ', '.join(changed))
    if args.json:
        print(json.dumps(m, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
