#!/usr/bin/env python3
"""思い出ノート「💌 ゆずに送る」メールのバックアップ（読み取り専用：メールの削除・送信は一切しない）。

Gmailコネクタ（読むだけ）での取り方:
  1) search_emails: subject:omoide-backup OR filename:omoide_part has:attachment newer_than:3d
  2) read_email(messageId) … 本文＋添付名/attachmentId
  3) DownloadFile connection=user-Gmail source.fileId="<messageId>/<attachmentId>"
     → omoide_part1of5.json などを保存
  4) python3 save_omoide_mail.py --msgid <ID> omoide_part1of5.json
     （本文が空でも JSON 添付だけでOK。本文の ---YUZU-DATA--- も従来どおり読める）

使い方:
  python3 save_omoide_mail.py --msgid <GmailメッセージID> body.txt
  python3 save_omoide_mail.py --msgid <ID> omoide_part1of5.json   … JSON添付
  python3 save_omoide_mail.py --msgid <ID> < body.txt
  python3 save_omoide_mail.py dir/                               … dir内のtxt/json
  python3 save_omoide_mail.py backup.json                        … 📦バックアップ

保存: /workspace/思い出ノート/backup/omoide_<YYYYMMDD>_<msgid>.json（同じものはスキップ）
統合: /workspace/思い出ノート/eiji_reactions.json
分割送信: profile_photos の part/parts/batch_id をマージしてから publish
トップ3コメント: payload.top_comments を data/top_comments.json に追記マージ（消さない）
"""
import sys,os,re,json,glob,hashlib
B='/workspace/思い出ノート/backup';M='/workspace/思い出ノート/eiji_reactions.json'
def payloads(txt, source_name=None):
    """Extract omoide payloads from mail body and/or JSON attachment contents.
    Accepts: ---YUZU-DATA--- blocks, raw JSON (shared file omoide_partXofY.json), backup JSON.
    """
    if isinstance(txt,bytes):
        txt=txt.decode('utf-8','replace')
    txt=(txt or '').lstrip('\ufeff')
    out=[]
    for m in re.finditer(r'---YUZU-DATA---(.*?)---END---',txt,re.S):
        raw=''.join(l.lstrip('> ').rstrip('\r') for l in m.group(1).splitlines()).strip()
        try:out.append(json.loads(raw))
        except Exception as e:print('JSON読めず:',e,file=sys.stderr)
    if not out:
        # Whole-file JSON attachment (navigator.share File) or pasted backup
        s=txt.strip()
        try:
            if s.startswith('{') or s.startswith('['):
                o=json.loads(s)
            else:
                o=json.loads(txt[txt.index('{'):txt.rindex('}')+1])
            if isinstance(o,list):
                out.extend([x for x in o if isinstance(x,dict)])
            elif isinstance(o,dict):
                out.append(o)
        except Exception as e:
            # short/empty mail bodies are normal when payload is in a JSON attachment
            if source_name and '{' in (txt or ''):
                print('attachment/body JSON読めず:',source_name,e,file=sys.stderr)
    good=[o for o in out if isinstance(o,dict) and o.get('app')=='omoide']
    if not good and out:
        print('omoide以外のJSON:', source_name or '(body)', file=sys.stderr)
    return good
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
            if len(raw)<32:
                print('skip tiny jpeg', name, slot, len(raw),'bytes'); continue
            rel=f'data/profile_photos/{safe}_{slot}.jpg'
            dest=os.path.join(D, rel)
            # never shrink/overwrite a larger existing photo with a smaller one unless clearly bigger content
            if os.path.exists(dest) and os.path.getsize(dest)>len(raw) and os.path.getsize(dest)>=32:
                print('keep existing larger photo', rel, os.path.getsize(dest),'>',len(raw)); 
                photos[slot]=rel; n+=1; continue
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

def publish_profile_order(o):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
    from pf_order_apply import _apply_pf_order
    return _apply_pf_order(o)


def merge_photo_parts(payloads_list):
    """If several mails share batch_id, merge profile_photos into one dict (never drop)."""
    by={}
    for o in payloads_list:
        if not isinstance(o,dict): continue
        bid=o.get('batch_id') or o.get('part_of')
        if not bid: continue
        by.setdefault(bid,[]).append(o)
    merged=[]
    for bid,arr in by.items():
        arr=sorted(arr,key=lambda x:int(x.get('part') or 1))
        base=dict(arr[0])
        photos={}
        for o in arr:
            for name,items in (o.get('profile_photos') or {}).items():
                photos.setdefault(name,[])
                # dedupe by slot (later part wins)
                byslot={int(it.get('slot',0)):it for it in photos[name] if isinstance(it,dict)}
                for it in (items or []):
                    if not isinstance(it,dict): continue
                    try: slot=int(it.get('slot',0))
                    except Exception: continue
                    byslot[slot]=it
                photos[name]=[byslot[k] for k in sorted(byslot)]
            # first part keeps reactions/fields; later may be empty
            if o is arr[0]:
                pass
            else:
                for k in ('reactions','replies','read','ack','ackrp','profile_fields','profile_order'):
                    if o.get(k) and not base.get(k):
                        base[k]=o[k]
        base['profile_photos']=photos
        base['parts_merged']=len(arr)
        base['batch_id']=bid
        merged.append(base)
        print('merged batch',bid,'parts',len(arr),'photos',sum(len(v) for v in photos.values()))
    return merged


def publish_top_comments(o):
    """Merge top_comments from mail payload into data/top_comments.json (add-only, never delete)."""
    tc=o.get('top_comments')
    if not tc or not isinstance(tc, dict):
        return 0
    root=os.path.dirname(os.path.abspath(__file__))
    path=os.path.join(root,'data','top_comments.json')
    import datetime
    jst=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
    stamp=jst.strftime('%Y-%m-%d %H:%M')
    if os.path.exists(path):
        data=json.load(open(path,encoding='utf-8'))
    else:
        data={'v':1,'comments':{},'updated':stamp,'note':'トップ3へのエイジのアツいコメント（追記のみ・消さない）'}
    data.setdefault('comments',{})
    added=0
    for who,arr in tc.items():
        if not isinstance(arr,list):
            continue
        who=str(who).strip()
        if not who: continue
        cur=data['comments'].setdefault(who,[])
        seen={(x.get('date') or '')+'|'+(x.get('text') or '') for x in cur if isinstance(x,dict)}
        for x in arr:
            if not isinstance(x,dict): continue
            text=(x.get('text') or '').strip()
            if not text: continue
            date=x.get('date') or stamp[:10]
            key=date+'|'+text
            if key in seen: continue
            entry={'text':text,'date':date,'at':x.get('at') or stamp,'by':x.get('by') or 'エイジ'}
            cur.append(entry); seen.add(key); added+=1
    if added:
        data['updated']=stamp
        tmp=path+'.tmp'
        with open(tmp,'w',encoding='utf-8') as f:
            json.dump(data,f,ensure_ascii=False,indent=1); f.write('\n')
        os.replace(tmp,path)
        print('top_comments +',added,'→',path)
    else:
        print('top_comments: no new')
    # eiji_reactions へのミラーは merge() 末尾で行う（途中上書きで消えないように）
    return added


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
        try: publish_top_comments(o)
        except Exception as e: print('top_comments merge:',e,file=sys.stderr)
    # mirror published top_comments (add-only source of truth)
    try:
        tc_path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'data','top_comments.json')
        if os.path.exists(tc_path):
            tc=json.load(open(tc_path,encoding='utf-8'))
            m['top_comments']=tc.get('comments') or {}
            m['top_comments_updated']=tc.get('updated')
    except Exception as e:
        print('top_comments mirror:',e,file=sys.stderr)
    m['files']=len(fs);json.dump(m,open(M,'w'),ensure_ascii=False,indent=1)
    print('merged →',M,f"reactions {len(m['reactions'])}・replies {len(m['replies'])}・read {len(m['read'])}")
a=sys.argv[1:];mid=None
if a[:1]in(['-h'],['--help']):sys.exit(__doc__)
if '--msgid' in a:i=a.index('--msgid');mid=a[i+1];del a[i:i+2]
while '--attach' in a:
    i=a.index('--attach'); a[i:i+2]=[a[i+1]]  # treat as positional path
src=[]
for x in a:
    if os.path.isdir(x):src+= [(open(f).read(),os.path.splitext(os.path.basename(f))[0]) for f in sorted(glob.glob(x+'/*')) if os.path.isfile(f)]
    else:src.append((open(x).read(),mid or (None if x.endswith('.json') else os.path.splitext(os.path.basename(x))[0])))
if not a:src.append((sys.stdin.read(),mid))
n=0
for txt,m in src:
    src_label=m or '(stdin/body)'
    ps=payloads(txt, src_label)
    if not ps:print('思い出ノートのJSON/YUZU-DATAが見つからない（本文が空なら JSON添付 omoide_part*.json を DownloadFile して渡してね）',file=sys.stderr)
    for k,o in enumerate(ps):
        mid=m if len(ps)==1 or not m else f'{m}-{k}'
        if o.get('part') and o.get('parts'):
            print('part',o.get('part'),'/',o.get('parts'),'batch',o.get('batch_id'))
        n+=save(o,mid)
        try: publish_profile_photos(o)
        except Exception as e: print('profile_photos:',e,file=sys.stderr)
        try: publish_profile_fields(o)
        except Exception as e: print('profile_fields:',e,file=sys.stderr)
        try: publish_profile_order(o)
        except Exception as e: print('profile_order:',e,file=sys.stderr)
        try: publish_top_comments(o)
        except Exception as e: print('top_comments:',e,file=sys.stderr)
    # Also publish a merged view when multiple parts share a batch_id (idempotent overwrite)
    try:
        for mo in merge_photo_parts(ps):
            if mo.get('parts_merged',0)>1:
                mid2=(m or 'batch')+'-merged-'+str(mo.get('batch_id') or '')
                save(mo, mid2)
                try: publish_profile_photos(mo)
                except Exception as e: print('profile_photos merged:',e,file=sys.stderr)
    except Exception as e:
        print('part merge:',e,file=sys.stderr)
merge();print('new',n)
