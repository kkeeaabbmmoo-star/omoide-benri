#!/usr/bin/env python3
"""みんなの思い出に1件追加して再ビルド。
  python3 add_memory.py <名前(例: すーさん / まい / 由依)> "<要点>" ["<感じたこと>"] [--date YYYY-MM-DD] [--no-push]
名前は /workspace/思い出ノート/<名前>.md の先頭一致（絵文字なしでOK）。公開ページなので個人情報・パスワードは書かないこと。"""
import sys,glob,os,datetime,subprocess
a=sys.argv[1:];push='--no-push' not in a;a=[x for x in a if x!='--no-push']
date=datetime.date.today().isoformat()
if '--date' in a:i=a.index('--date');date=a[i+1];del a[i:i+2]
if len(a)<2:sys.exit(__doc__)
who,pt=a[0],a[1];feel=a[2] if len(a)>2 else ''
fs=[f for f in glob.glob('/workspace/思い出ノート/*.md') if os.path.basename(f).startswith(who)]
if len(fs)!=1:sys.exit(f'名前が見つからない/複数: {fs}')
t=open(fs[0]).read()
blk=f'- 話したこと：{pt}\n'+(f'- 感じたこと：{feel}\n' if feel else '')
if f'## {date}\n' in t: t=t.replace(f'## {date}\n',f'## {date}\n{blk}',1)
else: t=t.rstrip('\n')+f'\n\n## {date}\n{blk}'
open(fs[0],'w').write(t);print('added to',fs[0])
subprocess.run(['python3',os.path.join(os.path.dirname(os.path.abspath(__file__)),'build.py')]+(['--push'] if push else []),check=True)
