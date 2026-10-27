#!/usr/bin/env python3
"""エイジの返事への、書いた本人からのひとこと返しを公開。
  python3 add_reply.py <名前(例: まい)> <日付YYYY-MM-DD または 投稿ID(まい_2026-10-25)> "<返事>" [--no-push]
  python3 add_reply.py --list   … 投稿IDの一覧
保存先 /workspace/思い出ノート/replies.json（公開ページに出るので個人情報NG）"""
import sys,os,json,glob,re,subprocess
D=os.path.dirname(os.path.abspath(__file__));RP='/workspace/思い出ノート/replies.json'
a=sys.argv[1:];push='--no-push' not in a;a=[x for x in a if x!='--no-push']
plain=lambda w:re.sub(r'[^\w・ー]','',w) or w
if a[:1]==['--list']:
    for f in sorted(glob.glob('/workspace/思い出ノート/*.md')):
        w=os.path.basename(f)[:-3]
        for d in re.findall(r'^## (.+)$',open(f).read(),re.M):print(plain(w)+'_'+d.strip())
    sys.exit()
if len(a)<3:sys.exit(__doc__)
who,key,text=a[0],a[1],a[2]
fs=[f for f in glob.glob('/workspace/思い出ノート/*.md') if os.path.basename(f).startswith(who)]
if len(fs)!=1:sys.exit(f'名前が見つからない/複数: {fs}')
w=plain(os.path.basename(fs[0])[:-3]);pid=key if '_' in key else w+'_'+key
if f'## {pid.split("_",1)[1]}' not in open(fs[0]).read():sys.exit('その日付の投稿がないよ: '+pid)
r=json.load(open(RP)) if os.path.exists(RP) else {}
r.setdefault(pid,[]).append({'who':w,'text':text[:80]});json.dump(r,open(RP,'w'),ensure_ascii=False,indent=1)
print('reply added',pid)
subprocess.run(['python3',os.path.join(D,'build.py')]+(['--push'] if push else []),check=True)
