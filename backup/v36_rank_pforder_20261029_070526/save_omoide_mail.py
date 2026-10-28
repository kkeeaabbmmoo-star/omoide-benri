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
def publish_profile_photos(o):
    """Write pending profile_photos from mail payload into data/profile_photos + profiles.json (merge, never delete)."""
    import base64, shutil
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))
    try:
        from photo_limits import photo_limit
    except Exception:
        def photo_limit(n): return 10 if n in ('エイジ','ゆず') else 4
    pp=o.get('profile_photos') or {}
    if not pp: return 0
    D=os.path.dirname(os.path.abspath(__file__))
    PROF=os.path.join(D,'data','profiles.json')
    OUT=os.path.join(D,'data','profile_photos')
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(PROF):
        print('no profiles.json', file=sys.stderr); return 0
    # backup profiles.json
    shutil.copy2(PROF, PROF+'.bak_'+__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S'))
    data=json.load(open(PROF,encoding='utf-8'))
    n=0
    for name, items in pp.items():
        if name not in data.get('members',{}):
            print('skip unknown member', name); continue
        lim=photo_limit(name)
        photos=list(data['members'][name].get('photos') or [])
        while len(photos)<lim: photos.append('')
        photos=photos[:lim]
        safe=re.sub(r'[^\w・ー\-]','_', name)
        for it in (items or []):
            try:
                slot=int(it.get('slot',0))
            except Exception:
                continue
            if not (0<=slot<lim): continue
            b64=it.get('jpeg') or it.get('data') or ''
            if not b64: continue
            if isinstance(b64,str) and b64.startswith('data:'):
                b64=b64.split(',',1)[-1]
            try:
                raw=base64.b64decode(b64)
            except Exception as e:
                print('b64 fail', name, slot, e); continue
            rel=f'data/profile_photos/{safe}_{slot}.jpg'
            dest=os.path.join(D, rel)
            open(dest,'wb').write(raw)
            photos[slot]=rel
            n+=1
            print('photo', rel, len(raw), 'bytes')
        data['members'][name]['photos']=photos
    if n:
        data['updated']=__import__('datetime').datetime.now(__import__('datetime').timezone(__import__('datetime').timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
        tmp=PROF+'.tmp'
        json.dump(data, open(tmp,'w'), ensure_ascii=False, indent=1)
        os.replace(tmp, PROF)
        # rebuild+push so everyone sees them
        try:
            import subprocess
            subprocess.run(['python3', os.path.join(D,'build.py'),'--push'], check=True)
        except Exception as e:
            print('build/push after photos:', e, file=sys.stderr)
    return n


def publish_profile_fields(o):
    """Merge profile_fields from mail into data/profiles.json (never delete other fields)."""
    import shutil, datetime
    pf=o.get('profile_fields') or {}
    if not pf: return 0
    D=os.path.dirname(os.path.abspath(__file__))
    PROF=os.path.join(D,'data','profiles.json')
    if not os.path.exists(PROF):
        print('no profiles.json', file=sys.stderr); return 0
    shutil.copy2(PROF, PROF+'.bak_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
    data=json.load(open(PROF,encoding='utf-8'))
    n=0
    for name, fields in pf.items():
        if name not in data.get('members',{}):
            print('skip unknown member', name); continue
        if not isinstance(fields, dict): continue
        m=data['members'][name]
        cur=dict(m.get('fields') or {})
        prov=list(m.get('provisional') or [])
        for k,v in fields.items():
            if k.startswith('__'): continue
            if v is None: continue
            vs=str(v).strip()
            if not vs: continue
            if cur.get(k)!=vs:
                cur[k]=vs; n+=1
            if k in prov: prov=[x for x in prov if x!=k]
        m['fields']=cur
        m['provisional']=prov
    if n:
        data['updated']=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
        tmp=PROF+'.tmp'
        json.dump(data, open(tmp,'w'), ensure_ascii=False, indent=1)
        os.replace(tmp, PROF)
        try:
            import subprocess
            subprocess.run(['python3', os.path.join(D,'build.py'),'--push'], check=True)
        except Exception as e:
            print('build/push after fields:', e, file=sys.stderr)
    return n

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
    for k,o in enumerate(ps):
        mid=m if len(ps)==1 or not m else f'{m}-{k}'
        n+=save(o,mid)
        try: publish_profile_photos(o)
        except Exception as e: print('profile_photos:',e,file=sys.stderr)
merge();print('new',n)
