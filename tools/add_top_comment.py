#!/usr/bin/env python3
"""トップ3へのエイジのアツいコメントを公開データに追記する（消さない・足すだけ）。

  python3 tools/add_top_comment.py <名前> "<コメント>" [--date YYYY-MM-DD] [--no-push]

例:
  python3 tools/add_top_comment.py 恵 "いつも笑顔ありがとう！今月も一緒にがんばろう🔥"
  python3 tools/add_top_comment.py 瀬戸 "やきもちかわいいぞ😤 2位キープおめでとう"

公開先: data/top_comments.json → build.py でページに乗る。
メールから取り込んだコメントも save_omoide_mail.py が同じファイルにマージする。
"""
from __future__ import annotations
import argparse, datetime, json, os, re, subprocess, sys

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(D, 'data', 'top_comments.json')
PROFILES = os.path.join(D, 'data', 'profiles.json')

def jst_now():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))

def jst_date():
    return jst_now().strftime('%Y-%m-%d')

def jst_stamp():
    return jst_now().strftime('%Y-%m-%d %H:%M')

def plain(w):
    return re.sub(r'[^\w・ー]', '', w) or w

def resolve_name(raw, known):
    raw = raw.strip()
    if raw in known: return raw
    p = plain(raw)
    for n in known:
        if plain(n) == p or n.startswith(raw) or plain(n).startswith(p):
            return n
    # allow new names (will still store under given plain)
    return p or raw

def load():
    if os.path.exists(PATH):
        return json.load(open(PATH, encoding='utf-8'))
    return {'v': 1, 'comments': {}, 'updated': jst_stamp(),
            'note': 'トップ3へのエイジのアツいコメント（追記のみ・消さない）'}

def save(data):
    data['updated'] = jst_stamp()
    tmp = PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, PATH)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('name')
    ap.add_argument('text')
    ap.add_argument('--date')
    ap.add_argument('--no-push', action='store_true')
    a = ap.parse_args()
    text = (a.text or '').strip()
    if not text:
        sys.exit('コメントが空だよ')
    if len(text) > 200:
        sys.exit('コメントは200文字までだよ')
    known = []
    if os.path.exists(PROFILES):
        try:
            pr = json.load(open(PROFILES, encoding='utf-8'))
            mem = pr.get('members') or {}
            if isinstance(mem, dict):
                known = list(mem.keys())
            elif isinstance(mem, list):
                known = list(mem)
            if isinstance(pr.get('order'), list):
                known = list(dict.fromkeys(list(pr['order']) + known))
        except Exception:
            pass
    # also from 思い出ノート folder names
    note = '/workspace/思い出ノート'
    if os.path.isdir(note):
        for f in os.listdir(note):
            if f.endswith('.md') and not re.fullmatch(r'[\d\-_ ]+', f[:-3]):
                known.append(f[:-3])
    who = resolve_name(a.name, known)
    data = load()
    data.setdefault('comments', {})
    arr = data['comments'].setdefault(who, [])
    entry = {'text': text, 'date': a.date or jst_date(), 'at': jst_stamp(), 'by': 'エイジ'}
    # dedupe exact same text+date
    if any(x.get('text') == entry['text'] and x.get('date') == entry['date'] for x in arr):
        print('already have same comment for', who, entry['date'])
    else:
        arr.append(entry)
        save(data)
        print('added', who, '→', text[:40], f'({len(arr)}件)')
    cmd = ['python3', os.path.join(D, 'build.py')]
    if not a.no_push:
        cmd.append('--push')
    subprocess.run(cmd, check=True)

if __name__ == '__main__':
    main()
