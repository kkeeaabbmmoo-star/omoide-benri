import json,re,glob,os,unicodedata
B='https://kkeeaabbmmoo-star.github.io/omoide-benri/'
d=json.load(open('data/profiles.json'));M=d['members'];order=d.get('order') or list(M)
files={}
for f in glob.glob('/workspace/思い出ノート/*.md'):
    n=os.path.basename(f)[:-3]
    base=re.sub(r'[^\w\u3040-\u30ff\u4e00-\u9fff]','',n)
    files[base]=f
out=[]
for k in order:
    m=M.get(k)
    if not m:continue
    f=files.get(re.sub(r'[^\w\u3040-\u30ff\u4e00-\u9fff]','',k))
    mem=[]
    if f:
        for blk in re.split(r'^## ',open(f).read(),flags=re.M)[1:]:
            lines=blk.strip().splitlines();date=lines[0].strip()
            if not re.match(r'\d{4}-\d\d-\d\d$',date):continue
            t=' '.join(l.lstrip('- ').strip() for l in lines[1:] if l.strip())
            mem.append({'date':date,'text':t})
    mem.sort(key=lambda x:x['date'],reverse=True)
    lk=m.get('look',{});ph=lk.get('photo') or ''
    fl=m.get('fields',{})
    out.append({'name':m.get('display',k),'photo':(B+ph) if ph else '','icon':lk.get('icon',''),
      'status':(mem[0]['text'][:60] if mem else ''),'memo':' / '.join(f'{a}：{v}' for a,v in fl.items() if v and '記入待ち' not in v),
      'profile':fl,'memories':mem[:10],'updated':mem[0]['date'] if mem else ''})
json.dump({'source':'思い出ノート','updated':d.get('updated'),'members':out},open('data/build_export.json','w'),ensure_ascii=False,indent=1)
print(len(out),[ (o['name'],len(o['memories']),bool(o['photo'])) for o in out])
