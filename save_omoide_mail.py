#!/usr/bin/env python3
"""思い出ノート「💌 ゆずに送る」メールのバックアップ（読み取り専用：メールの削除・送信は一切しない）。
Gmailには直接つながらないので、Gmailコネクタで探して本文をこのスクリプトに渡す。
  Gmail検索（読むだけ）:  "YUZU-DATA" "omoide" newer_than:3d   （件名: ゆず・由依・まいへ 思い出ノート omoide-backup-YYYYMMDD）
使い方:
  python3 save_omoide_mail.py --msgid <GmailメッセージID> body.txt      … 本文ファイル1通
  python3 save_omoide_mail.py --msgid <ID> < body.txt                    … 標準入力
  python3 save_omoide_mail.py dir/                                      … dir/<msgid>.txt をまとめて（ファイル名=msgid）
  python3 save_omoide_mail.py backup.json                               … 📦バックアップのJSONそのままでもOK
保存: /workspace/思い出ノート/backup/omoide_<YYYYMMDD>_<msgid>.json（同じものはスキップ）
統合: /workspace/思い出ノート/eiji_reactions.json（reactions/replies/read を新しい送信が優先でマージ。消さない）"""
import sys,os,re,json,glob,hashlib
B='/workspace/思い出ノート/backup';M='/workspace/思い出ノート/eiji_reactions.json'
def payloads(txt):
    out=[]
    for m in re.finditer(r'---YUZU-DATA---(.*?)---END---',txt,re.S):
        raw=''.join(l.lstrip('> ').rstrip('\r') for l in m.group(1).splitlines()).strip()
        try:out.append(json.loads(raw))
        except Exception as e:print('JSON読めず:',e,file=sys.stderr)
    if not out:
        try:
            o=json.loads(txt[txt.index('{'):txt.rindex('}')+1]);out=[o]
        except Exception:pass
    return [o for o in out if isinstance(o,dict) and o.get('app')=='omoide']
def save(o,mid):
    os.makedirs(B,exist_ok=True)
    d=re.sub(r'\D','',str(o.get('sent','')))[:8] or 'nodate'
    mid=re.sub(r'[^\w-]','',mid or '') or 'h'+hashlib.sha1(json.dumps(o,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:10]
    f=f'{B}/omoide_{d}_{mid}.json'
    if os.path.exists(f):print('skip（保存済み）',f);return False
    json.dump(o,open(f,'w'),ensure_ascii=False,indent=1);print('saved',f);return True
def merge():
    m=json.load(open(M)) if os.path.exists(M) else {}
    for k in ('reactions','replies','read'):m.setdefault(k,{})
    fs=sorted(glob.glob(B+'/omoide_*.json'),key=lambda f:str(json.load(open(f)).get('sent','')))
    for f in fs:
        o=json.load(open(f))
        for k in ('reactions','replies','read'):
            for i,v in (o.get(k) or {}).items():
                if k=='replies' and isinstance(v,str):v={'t':v}
                if k=='replies' and isinstance(m[k].get(i),dict) and isinstance(v,dict) and 'q' not in v and m[k][i].get('t')==v.get('t'):v={**m[k][i],**v}
                m[k][i]=v
        m['last_sent']=o.get('sent',m.get('last_sent'))
    m['files']=len(fs);json.dump(m,open(M,'w'),ensure_ascii=False,indent=1)
    print('merged →',M,f"reactions {len(m['reactions'])}・replies {len(m['replies'])}・read {len(m['read'])}")
a=sys.argv[1:];mid=None
if a[:1]in(['-h'],['--help']):sys.exit(__doc__)
if '--msgid' in a:i=a.index('--msgid');mid=a[i+1];del a[i:i+2]
src=[]
for x in a:
    if os.path.isdir(x):src+= [(open(f).read(),os.path.splitext(os.path.basename(f))[0]) for f in sorted(glob.glob(x+'/*')) if os.path.isfile(f)]
    else:src.append((open(x).read(),mid or (None if x.endswith('.json') else os.path.splitext(os.path.basename(x))[0])))
if not a:src.append((sys.stdin.read(),mid))
n=0
for txt,m in src:
    ps=payloads(txt)
    if not ps:print('思い出ノートのYUZU-DATAが見つからない（短いお知らせ版なら、エイジに貼り付け/共有で送ってもらってね）',file=sys.stderr)
    for k,o in enumerate(ps):n+=save(o,m if len(ps)==1 or not m else f'{m}-{k}')
merge();print('new',n)
