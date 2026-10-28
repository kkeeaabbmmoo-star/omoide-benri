#!/usr/bin/env python3
"""Regenerate 💖 ゆず＆みんなの思い出 (旧 思い出＆便利帳) from md sources. Usage: python3 build.py [--push]
PUBLIC page: never put passwords/passphrases in the md sources."""
import glob,os,re,html,json,sys,subprocess,datetime
D=os.path.dirname(os.path.abspath(__file__))
E=html.escape
def link(s):
    s=E(s);return re.sub(r'(https?://[^\s<]+)',r'<a href="\1" target="_blank">\1</a>',s)
# --- 思い出ノート
mem=[];empty=[]
for f in sorted(glob.glob('/workspace/思い出ノート/*.md')):
    if re.fullmatch(r'[\d\-_ ]+',os.path.basename(f)[:-3]):continue  # 名前でないファイル（例 180-35.md）は無視
    t=open(f).read();m=re.search(r'^# (.+?) の思い出ノート',t,re.M);who=m.group(1) if m else os.path.basename(f)[:-3]
    secs=re.split(r'^## ',t,flags=re.M)[1:]
    if not secs:empty.append(who)
    for s in secs:
        lines=s.strip().split('\n');date=lines[0].strip();body=[l.lstrip('- ').strip() for l in lines[1:] if l.strip()]
        mem.append((date,who,body))
mem.sort(key=lambda x:x[0],reverse=True)
# --- 便利帳は 2026-10-27 に便利ノートへ引っ越し（benri-note/tools/publish_benricho.py）
def ul(items):return '<ul>'+''.join('<li>'+link(i)+'</li>' for i in items)+'</ul>'
now=datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
card=lambda title,inner:f'<section class="card"><h2>{title}</h2>{inner}</section>'
ORDER=['ゆず💖','すーさん','まい🍊','まちゃ','らん','レイ','恵','瀬戸','由依🌸','愛🍒','おーさー','みきティ','しの','由紀','マキ','星野王子']
people={}
for d,w,b in mem: people.setdefault(w,[]).append((d,b))
for w in empty: people.setdefault(w,[])
names=[n for n in ORDER if n in people]+sorted(n for n in people if n not in ORDER)
AV={'ゆず💖':'yuzu','まい🍊':'mai','まちゃ':'macha','らん':'ran','レイ':'rei','恵':'megumi','瀬戸':'seto','由依🌸':'yui','愛🍒':'ai','おーさー':'osa','みきティ':'mikity','しの':'shino','由紀':'yuki','マキ':'maki'}
ICON={'ゆず💖':'💖','すーさん':'🍺','まい🍊':'🍊','まちゃ':'😂','らん':'☺️','レイ':'💓','恵':'🫂','瀬戸':'🥺','由依🌸':'🌸','星野王子':'🤩'}
for _w in list(people):
    if _w not in AV and os.path.exists(os.path.join(D,'img','avatars',re.sub(r'[^\w・ー]','',_w)+'.png')):AV[_w]=re.sub(r'[^\w・ー]','',_w)
def plain(w):return re.sub(r'[^\w・ー]','',w) or w
RP=os.path.join('/workspace/思い出ノート','replies.json')
replies=json.load(open(RP)) if os.path.exists(RP) else {}
def pid(w,d):return plain(w)+'_'+d
def pcard(w):
    es=sorted(people[w],key=lambda x:x[0] if re.match(r'\d{4}-',x[0]) else '0',reverse=True)[:5]
    def rq(r):
        q=r.get('quote');return (f'「{E(q[:30]+("…" if len(q)>30 else ""))}」に' if q else '')+f'↩️ <b>{E(r["who"])}</b>：{E(r["text"])}'
    def post(d,body):
        i=pid(w,d);rs=''.join(f'<div class="rp" data-rid="{E(i)}#{k}">{rq(r)}</div>' for k,r in enumerate(replies.get(i,[])))
        ps=''.join(f'<p class="ln" data-n="{k}">{link(b)}</p>' for k,b in enumerate(body,1))
        return f'<details class="fold" data-d="{E(d)}"><summary>{E(d)}</summary><div class="post" data-id="{E(i)}" data-who="{E(plain(w))}"><div class="md">{E(d)}</div>'+ps+rs+'<div class="act"></div></div></details>'
    inner=''.join(post(d,b) for d,b in es) or '<p class="sub">まだ書き込みはないよ</p>'
    av=(f'<img class="av" src="img/avatars/{AV[w]}.png?v=1" alt="" width="32" height="32">' if w in AV else f'<span class="ic">{ICON.get(w,"💬")}</span>')
    return f'<div class="mem" id="m-{E(plain(w))}" data-last="{E(last(w))}"><div class="nm"><span class="avw">{av}<small class="ago"></small></span><b>{E(plain(w))}</b><span class="md">（最新{len(es)}日分）</span></div>{inner}</div>'
def last(w):
    ds=sorted(d for d,_ in people.get(w,[]) if re.match(r'\d{4}-\d\d-\d\d$',d));return ds[-1] if ds else ('old' if people.get(w) else '')
ROW=['愛🍒','おーさー','みきティ','すーさん','恵','レイ','まい🍊','瀬戸','らん','まちゃ','由依🌸','ゆず💖','しの','由紀','マキ','星野王子']
def mbar():
    it=''
    for w in [x for x in ROW if x in people]+[x for x in names if x not in ROW]:
        n=E(plain(w));ic=f'<img src="img/avatars/{AV[w]}.png?v=1" alt="{n}" width="24" height="24">' if w in AV else f'<span>{ICON.get(w,"💬")}</span>'
        it+=f'<a href="#m-{n}" title="{n}" aria-label="{n}" data-last="{E(last(w))}"><span class="mi">{ic}</span><small class="ago"></small></a>'
    return f'<div id="mbar">{it}</div>'
memhtml=f'<div id="nstrip"></div><p class="sub">みんながエイジとの思い出を書くノートだよ（{len(names)}人）</p>'+''.join(pcard(w) for w in names)+'<button id="yzs" onclick="omSend()">💌 ゆずに送る（リアクション・返事）</button><div id="bk"><button onclick="omBackup()">📦 バックアップ</button><button onclick="omRestore()">↩️ 復元</button></div>'+mbar()
BENRI='<a class="mv" href="https://kkeeaabbmmoo-star.github.io/benri-note/">📒 便利帳は便利ノートへ引っ越したよ → 開く</a>'
body=card('💞 ゆず＆みんなの思い出',memhtml)+BENRI
JS=r'''<script src="send.js?v=1"></script><script src="backup_om.js?v=1"></script><script src="sent-status.js?v=ss1"></script><script src="nav.js?v=nv4"></script><script src="closeness.js?v=5"></script><script>
(function(){var K='om_react',KR='om_reply',R=JSON.parse(localStorage.getItem(K)||'{}'),P=JSON.parse(localStorage.getItem(KR)||'{}'),EM=['❤️','🙏','👏'];
Object.keys(P).forEach(function(k){if(typeof P[k]==='string')P[k]={t:P[k]}});
function sv(){localStorage.setItem(K,JSON.stringify(R));localStorage.setItem(KR,JSON.stringify(P))}
sv();
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function ymd(x){return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2)}
var now=new Date(),TD=ymd(now),YD=ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1));
function days(d){var a=d.split('-');return Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(+a[0],a[1]-1,+a[2]))/864e5)}
document.querySelectorAll('[data-last]').forEach(function(el){var d=el.dataset.last,g=el.querySelector('.ago'),t;
 if(!d)t='まだ';else if(d==='old')t='昔';else{var n=days(d);t=n<=0?'今日':n+'日';if(n>=3)g.classList.add('lg')}g.textContent=t});
document.querySelectorAll('.fold').forEach(function(f){var d=f.dataset.d,sm=f.querySelector('summary');
 sm.textContent=d===TD?'今日（'+d.slice(5).replace('-','/')+'）':d===YD?'昨日（'+d.slice(5).replace('-','/')+'）':/^\d{4}-/.test(d)?d.slice(5).replace('-','/'):d;
 if(d===TD)f.open=true});
var KD='om_read',RD=JSON.parse(localStorage.getItem(KD)||'{}');
var SR='om_seenrp',SRD=JSON.parse(localStorage.getItem(SR)||'{}');
function urp(p){return [].filter.call(p.querySelectorAll('.rp[data-rid]'),function(r){return !SRD[r.dataset.rid]})}
function mk(p){var ch=0;if(!RD[p.dataset.id]){RD[p.dataset.id]=Date.now();localStorage.setItem(KD,JSON.stringify(RD));ch=1}
 urp(p).forEach(function(r){SRD[r.dataset.rid]=Date.now();ch=1});if(ch){localStorage.setItem(SR,JSON.stringify(SRD));setTimeout(nwDraw,0)}p.classList.add('rd')}
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var p=e.target;p._t=setTimeout(function(){mk(p);io.unobserve(p)},1500)}else clearTimeout(e.target._t)})},{threshold:.6}):null;
document.querySelectorAll('.post').forEach(function(p){var id=p.dataset.id,a=p.querySelector('.act'),sel=null;
 if(RD[id])p.classList.add('rd');if((!RD[id]||urp(p).length)&&io)io.observe(p);p.addEventListener('click',function(){mk(p)});
 p.querySelectorAll('.ln').forEach(function(l){l.addEventListener('click',function(ev){if(ev.target.closest('a'))return;if(P[id])return;
  p.querySelectorAll('.ln.sel').forEach(function(x){x.classList.remove('sel')});
  if(sel===l){sel=null}else{sel=l;l.classList.add('sel')}draw()})});
 function draw(){a.innerHTML='';EM.forEach(function(e){var b=document.createElement('button');b.textContent=e;if(R[id]===e)b.className='on';b.onclick=function(){if(R[id]===e)delete R[id];else R[id]=e;sv();draw()};a.appendChild(b)});
  var r0=P[id];
  if(r0){var r=document.createElement('div');r.className='rp';r.style.width='100%';r.innerHTML=(r0.q?'「'+esc(r0.q.length>30?r0.q.slice(0,30)+'…':r0.q)+'」に':'')+'↩️ <b>エイジ</b>：'+esc(r0.t)+' <a href="#" style="font-size:12px">消す</a>';r.querySelector('a').onclick=function(ev){ev.preventDefault();delete P[id];sv();draw()};a.appendChild(r)}
  else{if(sel){var q=document.createElement('div');q.className='qt';q.innerHTML='✂️ この一文に返す <a href="#">やめる</a>';q.querySelector('a').onclick=function(ev){ev.preventDefault();ev.stopPropagation();sel.classList.remove('sel');sel=null;draw()};a.appendChild(q)}
   var i=document.createElement('input');i.placeholder=sel?'この一文にひとこと…':'ひとこと返事…';i.maxLength=60;var s=document.createElement('button');s.textContent='送る';
   s.onclick=function(){var v=i.value.trim();if(v){var o={t:v};if(sel){o.q=sel.textContent.trim();o.n=+sel.dataset.n;sel.classList.remove('sel');sel=null}P[id]=o;sv();draw()}};a.appendChild(i);a.appendChild(s)}}
 draw()});

/* 🆕 新着: 未読の投稿＋まだ見ていないみんなの返事（om_read / om_seenrp）。人数は自動 */
function nwDraw(){var tot=0,who=[];
 document.querySelectorAll('.post').forEach(function(p){var n=(RD[p.dataset.id]?0:1)+urp(p).length;p.classList.toggle('nw',n>0);var f=p.closest('.fold');if(f)f.classList.toggle('nw',n>0)});
 document.querySelectorAll('.mem').forEach(function(m){var n=0;m.querySelectorAll('.post').forEach(function(p){n+=(RD[p.dataset.id]?0:1)+urp(p).length});tot+=n;
  var nm=m.id.slice(2);if(n)who.push([nm,n,m]);bdg(m.querySelector('.avw'),n);var a=document.querySelector('#mbar a[href="#'+m.id+'"]');if(a)bdg(a.querySelector('.mi')||a,n)});
 var st=document.getElementById('nstrip');if(!st)return;
 if(!tot){st.innerHTML='<div class="ns0">新着なし ✨</div>';return}
 st.innerHTML='<div class="nsh">🆕 新着 '+tot+'件：'+who.map(function(w){return esc(w[0])}).join('・')+'</div><div class="nsc"></div><button class="nsall">全部既読にする</button>';
 var c=st.querySelector('.nsc');who.forEach(function(w){var b=document.createElement('button');b.className='nchip';var im=w[2].querySelector('.avw img,.avw .ic');b.innerHTML=(im?im.outerHTML:'')+'<span>'+esc(w[0])+'</span><i>'+w[1]+'</i>';b.onclick=function(){jump(w[2])};c.appendChild(b)});
 st.querySelector('.nsall').onclick=function(){if(!confirm('ぜんぶ既読にする？'))return;document.querySelectorAll('.post').forEach(function(p){RD[p.dataset.id]=RD[p.dataset.id]||Date.now();p.classList.add('rd');urp(p).forEach(function(r){SRD[r.dataset.rid]=Date.now()})});localStorage.setItem(KD,JSON.stringify(RD));localStorage.setItem(SR,JSON.stringify(SRD));nwDraw()}}
function bdg(el,n){if(!el)return;var d=el.querySelector('.nbd');if(!n){if(d)d.remove();return}if(!d){d=document.createElement('b');d.className='nbd';el.appendChild(d)}d.textContent=n>9?'9+':n}
function jump(m){var p=m.querySelector('.post.nw')||m;var f=p.closest&&p.closest('.fold');if(f)f.open=true;setTimeout(function(){p.scrollIntoView({behavior:'smooth',block:'center'})},30);p.classList.add('hl');setTimeout(function(){p.classList.remove('hl')},1600)}
document.querySelectorAll('.fold').forEach(function(f){f.addEventListener('toggle',nwDraw)});
nwDraw();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');})();
</script></body></html>'''
page=f'''<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ゆず＆みんなの思い出</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="思い出＆便利帳">
<meta name="theme-color" content="#ffb3c8">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
<style>body{{margin:0;background:linear-gradient(180deg,#fff0f5,#fff8e6) fixed;font-family:-apple-system,"Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif;color:#4a3340;line-height:1.6}}
header{{padding:calc(env(safe-area-inset-top) + 18px) 16px 8px;text-align:center}}h1{{font-size:22px;margin:0}}.sub{{color:#9a7b88;font-size:13px}}
main{{max-width:620px;margin:auto;padding:8px 12px 40px}}.card{{background:#fff;border-radius:18px;padding:12px 16px;margin:12px 0;box-shadow:0 2px 10px #f3c6d555}}
#rl{{display:block;width:100%;min-height:48px;margin:10px 0 2px;background:#d0567f;color:#fff;border:0;border-radius:24px;font-size:17px;font-weight:bold;box-shadow:0 2px 6px #0003}}
#rlf{{position:fixed;right:calc(env(safe-area-inset-right) + 16px);bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:9;width:56px;height:56px;border-radius:50%;border:0;background:#d0567f;color:#fff;font-size:24px;box-shadow:0 3px 10px #0004}}
body{{padding-bottom:calc(env(safe-area-inset-bottom) + 80px)}}
h2{{font-size:18px;margin:4px 0 8px}}h3{{font-size:15px;color:#d0567f;margin:10px 0 2px}}ul{{padding-left:20px;margin:4px 0}}li{{margin:4px 0}}a{{color:#d0567f;word-break:break-all}}
.mem{{border-left:4px solid #ffb3c8;padding:2px 10px;margin:8px 0}}.mem p{{margin:2px 0}}.md{{font-size:13px;color:#9a7b88}}.nm{{display:flex;align-items:center;gap:6px;margin:4px 0}}.ic{{font-size:22px;width:32px;height:32px;border-radius:50%;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center}}.mem{{scroll-margin-top:12px}}#mbar{{display:flex;justify-content:flex-end;gap:2px;margin:18px 0 2px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}}#mbar::-webkit-scrollbar{{display:none}}#mbar a{{flex:none;width:26px;display:inline-flex;flex-direction:column;align-items:center;text-decoration:none}}#mbar .mi{{width:24px;height:24px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 0 1.5px #ffd0e0}}.ago{{display:block;font-size:9px;line-height:1.3;color:#9a7b88;white-space:nowrap;text-align:center}}.ago.lg{{color:#c0587f;font-weight:bold}}.avw{{display:inline-flex;flex-direction:column;align-items:center;flex:none}}.fold{{margin:3px 0}}.fold>summary{{cursor:pointer;font-size:14px;color:#a0466a;padding:4px 2px;list-style-position:inside}}.ln{{border-radius:6px;padding:0 2px}}.ln.sel{{background:#ffe08a}}.qt{{font-size:12px;color:#a0466a;width:100%}}.qt a{{margin-left:6px}}#mbar img{{width:24px;height:24px;object-fit:cover;border-radius:50%}}html{{scroll-behavior:smooth}}#bk{{display:flex;gap:6px;justify-content:center;margin:6px 0 0}}#bk button{{border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:14px;font-size:13px;padding:4px 10px}}.mv{{display:block;text-align:center;margin:14px 0 6px;padding:10px;border-radius:14px;background:#fff;color:#2a9d7f;font-weight:bold;text-decoration:none;border:1px dashed #9fd8c4}}#nstrip{{margin:0 0 8px}}.ns0{{font-size:13px;color:#9a7b88;text-align:right}}.nsh{{font-size:14px;font-weight:bold;color:#c0587f;margin-bottom:4px}}.nsc{{display:flex;gap:6px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}}.nsc::-webkit-scrollbar{{display:none}}.nchip{{flex:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #f3c6d5;background:#fff6f9;border-radius:16px;padding:2px 8px 2px 2px;font-size:13px;color:#5a3a45}}.nchip img,.nchip .ic{{width:24px!important;height:24px!important;font-size:14px;border-radius:50%;object-fit:cover}}.nchip i{{font-style:normal;background:#e8384f;color:#fff;border-radius:9px;font-size:11px;padding:0 5px;font-weight:bold}}.nsall{{margin-top:4px;border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:12px;font-size:12px;padding:3px 10px}}.avw,#mbar .mi{{position:relative}}#mbar .mi{{overflow:visible!important}}#mbar .mi img{{border-radius:50%}}.nbd{{position:absolute;top:-4px;right:-5px;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#e8384f;color:#fff;font-size:10px;line-height:15px;text-align:center;font-weight:bold;box-shadow:0 0 0 1.5px #fff}}.post.nw>.md::before{{content:'🆕 ';}}.fold.nw>summary::after{{content:' 🆕';}}.post.hl{{background:#fff3b0!important}}.clSec{{margin:8px 0 10px;border:1px solid #ffd0e0;border-radius:14px;background:#fff9fb;padding:0 8px 8px}}.clSec>summary{{cursor:pointer;font-weight:800;color:#c0587f;padding:8px 4px;list-style-position:inside;font-size:15px}}.clTop{{margin:4px 0 8px;padding:8px;border-radius:12px;background:#fff;border:1px solid #ffe4ee}}.clTopH{{font-size:13px;font-weight:800;color:#c0587f;margin-bottom:4px}}.clTopL{{list-style:none;margin:0;padding:0}}.clTopL li{{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px dashed #ffe4ee;font-size:13px;color:#5a3a45}}.clTopL li:last-child{{border-bottom:0}}.clTopL i{{flex:none;width:18px;height:18px;border-radius:9px;background:#ff8fb3;color:#fff;font-style:normal;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}}.clTopAv{{flex:none;width:28px;height:28px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center;font-size:16px}}.clTopAv img{{width:28px;height:28px;object-fit:cover}}.clTopL b{{flex:1;font-size:13px}}.clTopL em{{font-style:normal;font-size:12px;color:#a0466a;font-weight:700}}.clWrap{{display:flex;flex-direction:column;gap:8px}}.clMap{{max-width:360px;width:100%;margin:0 auto;display:block;aspect-ratio:1/1}}.clList{{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}}.clRow{{display:flex;gap:8px;align-items:center;text-decoration:none;color:#5a3a45;padding:6px;border-radius:12px;background:#fff;border:1px solid #ffe4ee}}.clRow.yuzu{{border-color:#ffd700;box-shadow:0 0 0 1px #ffe08a}}.clRow.lock{{opacity:.7}}.clAv{{flex:none;width:36px;height:36px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:flex;align-items:center;justify-content:center}}.clAv img{{width:36px;height:36px;object-fit:cover}}.clIc{{font-size:20px}}.clSil{{font-size:10px;font-weight:800;color:#888}}.clMeta{{flex:1;min-width:0}}.clMeta b{{font-size:14px}}.clMeta small{{display:block;font-size:11px;color:#9a7b88}}.clBar{{display:block;height:6px;background:#ffe4ee;border-radius:3px;margin:3px 0;overflow:hidden}}.clBar i{{display:block;height:100%;background:linear-gradient(90deg,#ff8fb3,#d0567f);border-radius:3px}}.clFl{{display:block;font-size:11px;color:#c0587f}}.clWife{{font-size:11px;color:#b8860b;margin-left:4px}}@keyframes clTw{{0%,100%{{opacity:.3;transform:scale(.8)}}50%{{opacity:1;transform:scale(1.2)}}}}.clSpark circle{{animation:clTw 1.6s ease-in-out infinite}}.clSpark circle:nth-child(2){{animation-delay:.3s}}.clSpark circle:nth-child(3){{animation-delay:.7s}}.clSpark circle:nth-child(4){{animation-delay:1s}}.omToast{{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 28px);transform:translateX(-50%) translateY(20px);z-index:9999;background:#333;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:700;opacity:0;transition:.35s}}.omToast.on{{opacity:.95;transform:translateX(-50%) translateY(0)}}.av{{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px #ffe4ee}}
.post{{border-top:1px dashed #f3c6d5;padding:4px 6px;border-radius:10px;transition:background .4s}}.post.rd{{background:#eef7ee}}.post.rd>.md::after{{content:' 👀既読';color:#5a9a5a}}.rp{{font-size:13px;background:#fff6f9;border-radius:10px;padding:2px 8px;margin:3px 0}}
.act{{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:4px 0}}.act button{{border:1px solid #f3c6d5;background:#fff;border-radius:14px;font-size:15px;padding:2px 8px}}.act button.on{{background:#ffd6e4;border-color:#d0567f}}
.act input{{flex:1;min-width:120px;border:1px solid #f3c6d5;border-radius:12px;padding:5px 8px;font-size:16px}}
#yzs{{display:block;width:100%;min-height:44px;margin:12px 0 0;background:#fff;color:#d0567f;border:2px solid #d0567f;border-radius:22px;font-size:16px;font-weight:bold}}</style></head>
<body><header><h1>💖 ゆず＆みんなの思い出</h1><div class="sub">エイジ専用・最終更新 {now}</div><button id="rl" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄 更新</button></header><button id="rlf" aria-label="更新" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄</button><main>{body}</main>'''+JS
open(os.path.join(D,'index.html'),'w').write(page)
SWV='omoide-v16'
open(os.path.join(D,'sw.js'),'w').write("const C='"+SWV+"';self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});")
json.dump({"name":"ゆず＆みんなの思い出","short_name":"みんなの思い出","start_url":"./","scope":"./","display":"standalone","background_color":"#fff0f5","theme_color":"#ffb3c8","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open(os.path.join(D,'manifest.webmanifest'),'w'),ensure_ascii=False)
dts=[(d,w) for d,w,_ in mem if re.match(r'\d{4}-\d\d-\d\d$',d)]
os.makedirs(os.path.join(D,'data'),exist_ok=True);json.dump({'latest':max(dts)[0] if dts else '','who':plain(max(dts)[1]) if dts else '','posts':len(mem)},open(os.path.join(D,'data','latest.json'),'w'),ensure_ascii=False)
posts={}; 
for _w,_es in people.items():posts[plain(_w)]=len(_es)
json.dump({'posts':posts,'updated':now},open(os.path.join(D,'data','posts.json'),'w'),ensure_ascii=False)
print('built',len(mem),'memories')
if '--push' in sys.argv:
    subprocess.run(['git','-C',D,'add','-A']);subprocess.run(['git','-C',D,'commit','-qm','update '+now]);subprocess.run(['git','-C',D,'push','-q'],check=True)
