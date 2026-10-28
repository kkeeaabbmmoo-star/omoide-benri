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
    return f'<div class="mem" id="m-{E(plain(w))}" data-last="{E(last(w))}"><div class="nm"><span class="avw">{av}<small class="ago"></small></span><b>{E(plain(w))}</b><span class="md">（最新{len(es)}日分）</span><span class="stall"></span></div>{inner}</div>'
def last(w):
    ds=sorted(d for d,_ in people.get(w,[]) if re.match(r'\d{4}-\d\d-\d\d$',d));return ds[-1] if ds else ('old' if people.get(w) else '')
ROW=['愛🍒','おーさー','みきティ','すーさん','恵','レイ','まい🍊','瀬戸','らん','まちゃ','由依🌸','ゆず💖','しの','由紀','マキ','星野王子']
def mbar():
    it=''
    for w in [x for x in ROW if x in people]+[x for x in names if x not in ROW]:
        n=E(plain(w));ic=f'<img src="img/avatars/{AV[w]}.png?v=1" alt="{n}" width="24" height="24">' if w in AV else f'<span>{ICON.get(w,"💬")}</span>'
        it+=f'<a href="#m-{n}" title="{n}" aria-label="{n}" data-last="{E(last(w))}"><span class="mi">{ic}</span><small class="ago"></small></a>'
    return f'<div id="mbar">{it}</div>'
memhtml=f'<div id="nstrip"></div><p class="sub">みんながエイジとの思い出を書くノートだよ（{len(names)}人）</p>'+''.join(pcard(w) for w in names)+'<button id="yzs" onclick="omSend()">💌 ゆずとみんなに送る（リアクション・返事）</button><div id="bk"><button onclick="omBackup()">📦 バックアップ</button><button onclick="omRestore()">↩️ 復元</button></div>'+mbar()
BENRI='<a class="mv" href="https://kkeeaabbmmoo-star.github.io/benri-note/">📒 便利帳は便利ノートへ引っ越したよ → 開く</a>'
body=card('💞 ゆず＆みんなの思い出',memhtml)+BENRI
JS=r'''<script src="send.js?v=2"></script><script src="backup_om.js?v=4"></script><script src="sent-status.js?v=ss1"></script><script src="nav.js?v=nv4"></script><script src="closeness.js?v=12"></script><script src="monthly.js?v=2"></script><script>
(function(){var K='om_react',KR='om_reply',R=JSON.parse(localStorage.getItem(K)||'{}'),P=JSON.parse(localStorage.getItem(KR)||'{}');
var KM='om_marks',DEF_EM=['❤️','🙏','👏'];
function loadEM(){try{var a=JSON.parse(localStorage.getItem(KM)||'null');if(Array.isArray(a)&&a.length)return a.filter(function(x){return typeof x==='string'&&x.trim()}).slice(0,8)}catch(e){}return DEF_EM.slice()}
var EM=loadEM();
Object.keys(P).forEach(function(k){if(typeof P[k]==='string')P[k]={t:P[k]}});
function sv(){localStorage.setItem(K,JSON.stringify(R));localStorage.setItem(KR,JSON.stringify(P))}
sv();
function saveEM(a){EM=a.slice(0,8);localStorage.setItem(KM,JSON.stringify(EM));document.querySelectorAll('.post').forEach(function(p){/* redraw via custom event */});window.dispatchEvent(new Event('om_marks_change'))}
var GRID=['❤️','🙏','👏','😍','🥰','😘','💕','💞','💖','💗','💓','💘','💝','😊','🥹','🥰','😉','😆','🤣','😭','🥺','😤','🔥','✨','⭐','🌟','💯','👍','🙌','🤝','🫂','💋','🍑','🍒','🍊','🍰','🍜','🍺','💪','🫡','🌸','🎀','👑','🤩','😺','🙈','💬','📝'];
function openMarks(){
  var cur=EM.slice();
  var html='<div class="mkOv" id="mkOv"><div class="mkBox" role="dialog" aria-label="マークを選ぶ">'+
    '<div class="mkH">⚙️ リアクションマークを選ぶ</div>'+
    '<div class="mkSub">よく使うマークを最大8個まで。今あるリアクションはそのまま残るよ</div>'+
    '<div class="mkCur"></div>'+
    '<div class="mkG"></div>'+
    '<div class="mkAdd"><input class="mkIn" maxlength="4" placeholder="絵文字を入力…"><button type="button" class="mkAddB">＋追加</button></div>'+
    '<div class="mkAct"><button type="button" class="mkDef">デフォルトに戻す</button><button type="button" class="mkOk">保存</button></div>'+
    '<button type="button" class="mkX">とじる</button></div></div>';
  var old=document.getElementById('mkOv');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',html);
  var ov=document.getElementById('mkOv');
  function paint(){
    var c=ov.querySelector('.mkCur');c.innerHTML='<b>いまのセット：</b>'+cur.map(function(e,i){return '<button type="button" class="mkChip" data-i="'+i+'">'+e+' ✕</button>'}).join('')+(cur.length?'':'（空っぽ）');
    c.querySelectorAll('.mkChip').forEach(function(b){b.onclick=function(){cur.splice(+b.dataset.i,1);paint()}});
    var g=ov.querySelector('.mkG');g.innerHTML=GRID.map(function(e){return '<button type="button" class="mkE'+(cur.indexOf(e)>=0?' on':'')+'" data-e="'+e+'">'+e+'</button>'}).join('');
    g.querySelectorAll('.mkE').forEach(function(b){b.onclick=function(){var e=b.dataset.e;var i=cur.indexOf(e);if(i>=0)cur.splice(i,1);else{if(cur.length>=8){alert('8個までだよ');return}cur.push(e)}paint()}});
  }
  paint();
  ov.querySelector('.mkAddB').onclick=function(){var v=ov.querySelector('.mkIn').value.trim();if(!v)return;if(cur.indexOf(v)>=0){ov.querySelector('.mkIn').value='';return}if(cur.length>=8){alert('8個までだよ');return}cur.push(v);ov.querySelector('.mkIn').value='';paint()};
  ov.querySelector('.mkDef').onclick=function(){cur=DEF_EM.slice();paint()};
  ov.querySelector('.mkOk').onclick=function(){if(!cur.length){alert('1つ以上選んでね');return}saveEM(cur);ov.remove();redrawAll()};
  ov.querySelector('.mkX').onclick=function(){ov.remove()};
  ov.addEventListener('click',function(ev){if(ev.target===ov)ov.remove()});
}
function redrawAll(){document.querySelectorAll('.post').forEach(function(p){var d=p._omDraw;if(d)d()})}
function attachMic(i,wrap){
  var mic=document.createElement('button');mic.type='button';mic.className='micb';mic.title='音声入力';mic.textContent='🎤';
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){mic.onclick=function(ev){ev.preventDefault();ev.stopPropagation();i.focus();var h=document.createElement('div');h.className='micHint';h.textContent='キーボードの🎤でも入力できるよ';wrap.appendChild(h);setTimeout(function(){h.remove()},2200)};wrap.appendChild(mic);return}
  var rec=null,on=0;
  mic.onclick=function(ev){ev.preventDefault();ev.stopPropagation();
    if(on){try{rec.stop()}catch(e){}return}
    rec=new SR();rec.lang='ja-JP';rec.interimResults=false;rec.continuous=false;
    rec.onstart=function(){on=1;mic.classList.add('on');mic.textContent='🎙️'};
    rec.onend=function(){on=0;mic.classList.remove('on');mic.textContent='🎤'};
    rec.onerror=function(){on=0;mic.classList.remove('on');mic.textContent='🎤'};
    rec.onresult=function(ev){var t='';for(var k=0;k<ev.results.length;k++)t+=ev.results[k][0].transcript;if(!t)return;
      var cur=i.value,add=t;i.value=(cur&&!/\s$/.test(cur)?cur+' ':'')+add;i.focus();
      try{i.setSelectionRange(i.value.length,i.value.length)}catch(e){}};
    try{rec.start()}catch(e){mic.onclick()}};
  wrap.appendChild(mic);
}

function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function ymd(x){return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2)}
var now=new Date(),TD=ymd(now),YD=ymd(new Date(now.getFullYear(),now.getMonth(),now.getDate()-1));
function days(d){var a=d.split('-');return Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(+a[0],a[1]-1,+a[2]))/864e5)}
document.querySelectorAll('[data-last]').forEach(function(el){var d=el.dataset.last,g=el.querySelector('.ago'),t;
 if(!d)t='まだ';else if(d==='old')t='昔';else{var n=days(d);t=n<=0?'今日':n+'日';if(n>=3)g.classList.add('lg')}if(g)g.textContent=t;
 var st=el.classList.contains('mem')?el.querySelector('.stall'):null;if(!st)return;
 st.className='stall';
 if(!d){st.textContent='まだ書き込みなし';st.classList.add('none')}
 else if(d==='old'){st.textContent='最終書き込み：昔';st.classList.add('lg')}
 else{var n=days(d);if(n<=0){st.textContent='今日書いたよ';st.classList.add('ok')}
  else{st.textContent='最終書き込みから'+n+'日目';if(n>=3)st.classList.add('lg');else st.classList.add('soon')}}
});
document.querySelectorAll('.fold').forEach(function(f){var d=f.dataset.d,sm=f.querySelector('summary');
 sm.textContent=d===TD?'今日（'+d.slice(5).replace('-','/')+'）':d===YD?'昨日（'+d.slice(5).replace('-','/')+'）':/^\d{4}-/.test(d)?d.slice(5).replace('-','/'):d;
 if(d===TD)f.open=true});
/* 既読は明示のみ（スクロールでは消えない）。新キー om_ack / om_ackrp。旧 om_read / om_seenrp は消さない */
var KD='om_read',RD=JSON.parse(localStorage.getItem(KD)||'{}'); /* legacy keep */
var SR='om_seenrp',SRD=JSON.parse(localStorage.getItem(SR)||'{}'); /* legacy keep */
var KA='om_ack',ACK=JSON.parse(localStorage.getItem(KA)||'{}');
var KAR='om_ackrp',ACKR=JSON.parse(localStorage.getItem(KAR)||'{}');
var KF='om_filt',FILT=localStorage.getItem(KF)||'all';
if(localStorage.getItem('om_ack_mig')!=='1'){
  /* スクロール自動既読は未読に戻す。返事済みの投稿だけ確認済み扱い */
  Object.keys(P).forEach(function(id){if(P[id]&&P[id].t&&!ACK[id])ACK[id]={at:P[id].at||Date.now(),via:'reply'}});
  localStorage.setItem(KA,JSON.stringify(ACK));
  localStorage.setItem('om_ack_mig','1');
}
function saveAck(){localStorage.setItem(KA,JSON.stringify(ACK));localStorage.setItem(KAR,JSON.stringify(ACKR))}
function isAck(p){return !!ACK[p.dataset.id]}
function urp(p){return [].filter.call(p.querySelectorAll('.rp[data-rid]'),function(r){return !ACKR[r.dataset.rid]})}
function unreadN(p){return (isAck(p)?0:1)+urp(p).length}
function markAck(p,via){var id=p.dataset.id,ch=0;if(!ACK[id]){ACK[id]={at:Date.now(),via:via||'tap'};ch=1}
 urp(p).forEach(function(r){if(!ACKR[r.dataset.rid]){ACKR[r.dataset.rid]={at:Date.now(),via:via||'tap'};ch=1}});
 if(ch){saveAck();setTimeout(function(){paintPost(p);nwDraw()},0)}else paintPost(p)}
function replied(id){return !!(P[id]&&P[id].t)}
function replyDate(id){var o=P[id];if(!o)return '';if(o.at){var s=String(o.at);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(5,7)+'/'+s.slice(8,10);try{var d=new Date(+s||s);if(!isNaN(d))return ('0'+(d.getMonth()+1)).slice(-2)+'/'+('0'+d.getDate()).slice(-2)}catch(e){}}return ''}
function paintPost(p){var id=p.dataset.id,rd=replied(id),ack=isAck(p);
 p.classList.toggle('rd',ack);p.classList.toggle('replied',rd);p.classList.toggle('unreplied',!rd);
 p.classList.toggle('nw',unreadN(p)>0);
 var tag=p.querySelector('.ptag');if(!tag){tag=document.createElement('span');tag.className='ptag';var md=p.querySelector('.md');if(md)md.appendChild(tag);else p.insertBefore(tag,p.firstChild)}
 if(rd){var ds=replyDate(id);tag.textContent='✅ 返信済み'+(ds?' '+ds:'');tag.className='ptag ok'}
 else{tag.textContent='未返信';tag.className='ptag ng'}
 var cf=p.querySelector('.ackb');
 if(!ack){if(!cf){cf=document.createElement('button');cf.className='ackb';cf.type='button';cf.textContent='✓ 確認した';
  cf.onclick=function(ev){ev.stopPropagation();markAck(p,'tap')};
  var a=p.querySelector('.act');if(a)a.parentNode.insertBefore(cf,a);else p.appendChild(cf)}
 }else if(cf)cf.remove();
 /* teammate reply ack buttons */
 p.querySelectorAll('.rp[data-rid]').forEach(function(r){var rid=r.dataset.rid,b=r.querySelector('.ackb');
  if(ACKR[rid]){r.classList.add('rd');if(b)b.remove();return}
  r.classList.remove('rd');
  if(!b){b=document.createElement('button');b.className='ackb sm';b.type='button';b.textContent='✓ 確認した';
   b.onclick=function(ev){ev.stopPropagation();ACKR[rid]={at:Date.now(),via:'tap'};saveAck();paintPost(p);nwDraw()};r.appendChild(b)}
 });
}
document.querySelectorAll('.post').forEach(function(p){var id=p.dataset.id,a=p.querySelector('.act'),sel=null;
 /* NO scroll/click auto-read */
 p.querySelectorAll('.ln').forEach(function(l){l.addEventListener('click',function(ev){if(ev.target.closest('a,button'))return;if(P[id])return;
  p.querySelectorAll('.ln.sel').forEach(function(x){x.classList.remove('sel')});
  if(sel===l){sel=null}else{sel=l;l.classList.add('sel')}draw()})});
 function draw(){a.innerHTML='';EM=loadEM();
  EM.forEach(function(e){var b=document.createElement('button');b.type='button';b.textContent=e;if(R[id]===e)b.className='on';
   /* show orphan custom mark if current reaction not in EM */
   b.onclick=function(){if(R[id]===e)delete R[id];else R[id]=e;sv();draw()};a.appendChild(b)});
  if(R[id]&&EM.indexOf(R[id])<0){var ob=document.createElement('button');ob.type='button';ob.textContent=R[id];ob.className='on';ob.title='セット外のマーク（そのまま残ってるよ）';ob.onclick=function(){delete R[id];sv();draw()};a.appendChild(ob)}
  var gear=document.createElement('button');gear.type='button';gear.className='mkGear';gear.textContent='⚙️';gear.title='マークを選ぶ';gear.onclick=function(ev){ev.stopPropagation();openMarks()};a.appendChild(gear);
  var r0=P[id];
  if(r0){var r=document.createElement('div');r.className='rp eiji';r.style.width='100%';r.innerHTML=(r0.q?'「'+esc(r0.q.length>30?r0.q.slice(0,30)+'…':r0.q)+'」に':'')+'↩️ <b>エイジ</b>：'+esc(r0.t)+' <a href="#" style="font-size:12px">消す</a>';r.querySelector('a').onclick=function(ev){ev.preventDefault();delete P[id];sv();paintPost(p);draw();nwDraw()};a.appendChild(r)}
  else{if(sel){var q=document.createElement('div');q.className='qt';q.innerHTML='✂️ この一文に返す <a href="#">やめる</a>';q.querySelector('a').onclick=function(ev){ev.preventDefault();ev.stopPropagation();sel.classList.remove('sel');sel=null;draw()};a.appendChild(q)}
   var row=document.createElement('div');row.className='actRow';row.style.cssText='display:flex;gap:4px;align-items:center;width:100%;flex-wrap:wrap';
   var i=document.createElement('input');i.placeholder=sel?'この一文にひとこと…':'ひとこと返事…';i.maxLength=60;i.style.flex='1';i.style.minWidth='100px';
   var s=document.createElement('button');s.type='button';s.textContent='送る';
   s.onclick=function(){var v=i.value.trim();if(v){var o={t:v,at:TD};if(sel){o.q=sel.textContent.trim();o.n=+sel.dataset.n;sel.classList.remove('sel');sel=null}P[id]=o;sv();markAck(p,'reply');draw()}};
   row.appendChild(i);attachMic(i,row);row.appendChild(s);a.appendChild(row)}
  paintPost(p)}
 p._omDraw=draw;
 draw()});
window.addEventListener('om_marks_change',redrawAll);

/* 🆕 新着バッジ＝未確認のみ。フィルタ＋未返信数 */
function nwDraw(){var tot=0,who=[],uwho=[];
 document.querySelectorAll('.post').forEach(function(p){var n=unreadN(p);p.classList.toggle('nw',n>0);var f=p.closest('.fold');
  /* fold nw if any visible unread child */
 });
 document.querySelectorAll('.fold').forEach(function(f){var n=0;f.querySelectorAll('.post').forEach(function(p){n+=unreadN(p)});f.classList.toggle('nw',n>0)});
 document.querySelectorAll('.mem').forEach(function(m){var n=0,ur=0;m.querySelectorAll('.post').forEach(function(p){n+=unreadN(p);if(!replied(p.dataset.id))ur++});tot+=n;
  var nm=m.id.slice(2);if(n)who.push([nm,n,m]);if(ur)uwho.push([nm,ur,m]);
  bdg(m.querySelector('.avw'),n);var a=document.querySelector('#mbar a[href="#'+m.id+'"]');if(a)bdg(a.querySelector('.mi')||a,n);
  var ub=m.querySelector('.ubdg');if(!ub){ub=document.createElement('span');ub.className='ubdg';var nmEl=m.querySelector('.nm');if(nmEl)nmEl.appendChild(ub)}
  if(ur){ub.textContent='未返信'+ur;ub.style.display=''}else ub.style.display='none';
  applyFilt(m)});
 var st=document.getElementById('nstrip');if(!st)return;
 var filtHTML='<div class="filt">表示：'
  +[['all','すべて'],['unreplied','未返信'],['replied','返信済み']].map(function(x){return '<button type="button" data-f="'+x[0]+'" class="'+(FILT===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')
  +'</div>';
 if(!tot){st.innerHTML=filtHTML+'<div class="ns0">未確認の新着なし ✨'+(uwho.length?'　・　未返信 '+uwho.reduce(function(s,w){return s+w[1]},0)+'件':'')+'</div>'}
 else{
  st.innerHTML=filtHTML+'<div class="nsh">🆕 未確認 '+tot+'件：'+who.map(function(w){return esc(w[0])}).join('・')+'</div><div class="nsc"></div>'
   +(uwho.length?'<div class="nsh2">✉️ 未返信 '+uwho.map(function(w){return esc(w[0])+'('+w[1]+')'}).join('・')+'</div>':'')
   +'<button class="nsall">全部確認したにする</button>';
  var c=st.querySelector('.nsc');who.forEach(function(w){var b=document.createElement('button');b.className='nchip';var im=w[2].querySelector('.avw img,.avw .ic');b.innerHTML=(im?im.outerHTML:'')+'<span>'+esc(w[0])+'</span><i>'+w[1]+'</i>';b.onclick=function(){jump(w[2])};c.appendChild(b)});
  st.querySelector('.nsall').onclick=function(){if(!confirm('ぜんぶ「確認した」にする？（返事は残るよ）'))return;document.querySelectorAll('.post').forEach(function(p){markAck(p,'bulk')});nwDraw()}
 }
 st.querySelectorAll('.filt button').forEach(function(b){b.onclick=function(){FILT=b.dataset.f;localStorage.setItem(KF,FILT);nwDraw()}});
}
function applyFilt(m){m.querySelectorAll('.post').forEach(function(p){var rd=replied(p.dataset.id),hide=FILT==='unreplied'?rd:FILT==='replied'?!rd:false;p.classList.toggle('hide',hide);var f=p.closest('.fold');if(f){var any=[].some.call(f.querySelectorAll('.post'),function(x){return !x.classList.contains('hide')});f.classList.toggle('hide',!any)}})}
function bdg(el,n){if(!el)return;var d=el.querySelector('.nbd');if(!n){if(d)d.remove();return}if(!d){d=document.createElement('b');d.className='nbd';el.appendChild(d)}d.textContent=n>9?'9+':n}
function jump(m){var p=m.querySelector('.post.nw:not(.hide)')||m.querySelector('.post:not(.hide)')||m;var f=p.closest&&p.closest('.fold');if(f)f.open=true;setTimeout(function(){p.scrollIntoView({behavior:'smooth',block:'center'})},30);p.classList.add('hl');setTimeout(function(){p.classList.remove('hl')},1600)}
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
.mem{{border-left:4px solid #ffb3c8;padding:2px 10px;margin:8px 0}}.mem p{{margin:2px 0}}.md{{font-size:13px;color:#9a7b88}}.nm{{display:flex;align-items:center;gap:6px;margin:4px 0}}.ic{{font-size:22px;width:32px;height:32px;border-radius:50%;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center}}.mem{{scroll-margin-top:12px}}#mbar{{display:flex;justify-content:flex-end;gap:2px;margin:18px 0 2px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}}#mbar::-webkit-scrollbar{{display:none}}#mbar a{{flex:none;width:26px;display:inline-flex;flex-direction:column;align-items:center;text-decoration:none}}#mbar .mi{{width:24px;height:24px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 0 1.5px #ffd0e0}}.ago{{display:block;font-size:9px;line-height:1.3;color:#9a7b88;white-space:nowrap;text-align:center}}.ago.lg{{color:#c0587f;font-weight:bold}}.stall{{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;color:#9a7b88;white-space:nowrap}}.stall.ok{{color:#5a9a5a}}.stall.soon{{color:#9a7b88}}.stall.lg{{color:#e05a2b;font-weight:800}}.stall.none{{color:#b0a0a8;font-weight:600}}.avw{{display:inline-flex;flex-direction:column;align-items:center;flex:none}}.fold{{margin:3px 0}}.fold>summary{{cursor:pointer;font-size:14px;color:#a0466a;padding:4px 2px;list-style-position:inside}}.ln{{border-radius:6px;padding:0 2px}}.ln.sel{{background:#ffe08a}}.qt{{font-size:12px;color:#a0466a;width:100%}}.qt a{{margin-left:6px}}#mbar img{{width:24px;height:24px;object-fit:cover;border-radius:50%}}html{{scroll-behavior:smooth}}#bk{{display:flex;gap:6px;justify-content:center;margin:6px 0 0}}#bk button{{border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:14px;font-size:13px;padding:4px 10px}}.mv{{display:block;text-align:center;margin:14px 0 6px;padding:10px;border-radius:14px;background:#fff;color:#2a9d7f;font-weight:bold;text-decoration:none;border:1px dashed #9fd8c4}}#nstrip{{margin:0 0 8px}}.ns0{{font-size:13px;color:#9a7b88;text-align:right}}.nsh{{font-size:14px;font-weight:bold;color:#c0587f;margin-bottom:4px}}.nsc{{display:flex;gap:6px;overflow-x:auto;padding:2px 0 4px;scrollbar-width:none}}.nsc::-webkit-scrollbar{{display:none}}.nchip{{flex:none;display:inline-flex;align-items:center;gap:4px;border:1px solid #f3c6d5;background:#fff6f9;border-radius:16px;padding:2px 8px 2px 2px;font-size:13px;color:#5a3a45}}.nchip img,.nchip .ic{{width:24px!important;height:24px!important;font-size:14px;border-radius:50%;object-fit:cover}}.nchip i{{font-style:normal;background:#e8384f;color:#fff;border-radius:9px;font-size:11px;padding:0 5px;font-weight:bold}}.nsall{{margin-top:4px;border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:12px;font-size:12px;padding:3px 10px}}.avw,#mbar .mi{{position:relative}}.clMed{{position:absolute;left:-6px;bottom:-4px;z-index:2;font-size:16px;line-height:1;filter:drop-shadow(0 0 1px #fff) drop-shadow(0 1px 2px #0003);pointer-events:none}}.clMed[data-r="4"],.clMed[data-r="5"]{{font-size:14px}}#mbar .mi{{overflow:visible!important}}#mbar .mi img{{border-radius:50%}}.nbd{{position:absolute;top:-4px;right:-5px;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#e8384f;color:#fff;font-size:10px;line-height:15px;text-align:center;font-weight:bold;box-shadow:0 0 0 1.5px #fff}}.post.nw>.md::before{{content:'🆕 ';}}.fold.nw>summary::after{{content:' 🆕';}}.post.hl{{background:#fff3b0!important}}.clSec{{margin:8px 0 10px;border:1px solid #ffd0e0;border-radius:14px;background:#fff9fb;padding:0 8px 8px}}.clSec>summary{{cursor:pointer;font-weight:800;color:#c0587f;padding:8px 4px;list-style-position:inside;font-size:15px}}#omCrop{{position:fixed;inset:0;z-index:2147483500;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;touch-action:none}}#omCrop canvas{{width:min(300px,86vw);height:min(300px,86vw);touch-action:none;border-radius:50%;background:#fff}}#omCrop .t{{color:#fff;font-size:14px;text-align:center;padding:0 16px}}#omCrop .b{{display:flex;gap:12px}}#omCrop button{{font-size:16px;padding:10px 22px;border-radius:20px;border:0;font-weight:bold}}#omCrop .ok{{background:#ff5f8f;color:#fff}}#omCrop .ng{{background:#eee;color:#555}}.clPhoto{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:2px 0 8px}}.clPhoto button{{border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:14px;font-size:13px;font-weight:700;padding:6px 12px}}.clPhoto .clPhRst{{color:#888;font-weight:600}}.clPtsTap{{color:#a0466a;font-weight:800;text-decoration:underline dotted #f3a0b8;cursor:pointer;-webkit-tap-highlight-color:transparent}}.clPtsOv{{position:fixed;inset:0;z-index:2147483000;background:#0007;display:flex;align-items:flex-end;justify-content:center;padding:12px}}.clPtsBox{{background:#fff;width:100%;max-width:420px;max-height:86vh;overflow:auto;border-radius:18px 18px 12px 12px;padding:14px 14px calc(env(safe-area-inset-bottom) + 14px);box-shadow:0 -4px 24px #0003}}.clPtsH{{font-size:16px;font-weight:800;color:#c0587f;margin:0 0 4px}}.clPtsSub{{font-size:12px;color:#9a7b88;margin-bottom:8px}}.clPtsL{{margin:0 0 10px;padding:0;list-style:none}}.clPtsL li{{padding:8px 0;border-bottom:1px dashed #ffe4ee;font-size:13px;color:#5a3a45;line-height:1.45}}.clPtsL b{{color:#a0466a}}.clPtsD{{font-size:12px;color:#9a7b88;margin-top:4px}}.clPtsNote{{font-size:12px;color:#c0587f}}.clPtsRule{{background:#fff6f9;border-radius:12px;padding:10px;font-size:12.5px;color:#5a3a45;margin-bottom:10px}}.clPtsRule ul{{margin:6px 0 0;padding-left:18px}}.clPtsRule li{{margin:3px 0}}.clPtsX{{display:block;width:100%;border:0;border-radius:14px;padding:12px;font-size:15px;font-weight:800;background:#d0567f;color:#fff}}.clTop{{margin:4px 0 8px;padding:8px;border-radius:12px;background:#fff;border:1px solid #ffe4ee}}.clTopH{{font-size:13px;font-weight:800;color:#c0587f;margin-bottom:4px;line-height:1.35}}.clTopL{{list-style:none;margin:0;padding:0;max-height:min(52vh,360px);overflow-y:auto;-webkit-overflow-scrolling:touch}}.clTopL li{{display:flex;align-items:center;gap:6px;padding:3px 2px;border-bottom:1px dashed #ffe4ee;font-size:12.5px;color:#5a3a45;min-height:28px}}.clTopL li:last-child{{border-bottom:0}}.clTopL li[data-r="1"] i,.clTopL li[data-r="2"] i,.clTopL li[data-r="3"] i,.clTopL li[data-r="4"] i,.clTopL li[data-r="5"] i{{background:transparent;width:auto;min-width:28px;gap:2px;padding:0 2px}}.clTopL i{{flex:none;width:18px;height:18px;border-radius:9px;background:#ff8fb3;color:#fff;font-style:normal;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}}.clTopMed{{font-size:14px;line-height:1}}.clTopN{{font-size:10px;font-weight:800;color:#c0587f;margin-left:1px}}.clTopAv{{flex:none;width:24px;height:24px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:inline-flex;align-items:center;justify-content:center;font-size:14px}}.clTopAv img{{width:24px;height:24px;object-fit:cover}}.clTopL b{{flex:1;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}.clTopL em{{font-style:normal;font-size:11px;color:#a0466a;font-weight:700;flex:none}}.clWrap{{display:flex;flex-direction:column;gap:8px}}.clMap{{max-width:360px;width:100%;margin:0 auto;display:block;aspect-ratio:1/1}}.clList{{display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto}}.clRow{{display:flex;gap:8px;align-items:center;text-decoration:none;color:#5a3a45;padding:6px;border-radius:12px;background:#fff;border:1px solid #ffe4ee}}.clRow.yuzu{{border-color:#ffd700;box-shadow:0 0 0 1px #ffe08a}}.clRow.lock{{opacity:.7}}.clAv{{flex:none;width:36px;height:36px;border-radius:50%;overflow:hidden;background:#ffe4ee;display:flex;align-items:center;justify-content:center}}.clAv img{{width:36px;height:36px;object-fit:cover}}.clIc{{font-size:20px}}.clSil{{font-size:10px;font-weight:800;color:#888}}.clMeta{{flex:1;min-width:0}}.clMeta b{{font-size:14px}}.clMeta small{{display:block;font-size:11px;color:#9a7b88}}.clBar{{display:block;height:6px;background:#ffe4ee;border-radius:3px;margin:3px 0;overflow:hidden}}.clBar i{{display:block;height:100%;background:linear-gradient(90deg,#ff8fb3,#d0567f);border-radius:3px}}.clFl{{display:block;font-size:11px;color:#c0587f}}.clWife{{font-size:11px;color:#b8860b;margin-left:4px}}@keyframes clTw{{0%,100%{{opacity:.3;transform:scale(.8)}}50%{{opacity:1;transform:scale(1.2)}}}}.clSpark circle{{animation:clTw 1.6s ease-in-out infinite}}.clSpark circle:nth-child(2){{animation-delay:.3s}}.clSpark circle:nth-child(3){{animation-delay:.7s}}.clSpark circle:nth-child(4){{animation-delay:1s}}.omToast{{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 28px);transform:translateX(-50%) translateY(20px);z-index:9999;background:#333;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:700;opacity:0;transition:.35s}}.omToast.on{{opacity:.95;transform:translateX(-50%) translateY(0)}}.av{{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px #ffe4ee}}
.ptag{{display:inline-block;margin-left:6px;font-size:11px;font-weight:800;border-radius:8px;padding:0 6px;vertical-align:middle}}.ptag.ok{{background:#e5f6ea;color:#2a8a4a}}.ptag.ng{{background:#ffe8ee;color:#c0587f}}.ackb{{display:inline-block;margin:4px 0;border:1px solid #7ec8a0;background:#eefaf3;color:#2a8a4a;border-radius:12px;font-size:13px;font-weight:700;padding:3px 10px}}.ackb.sm{{font-size:11px;padding:1px 7px;margin-left:6px}}.post.hide,.fold.hide{{display:none!important}}.filt{{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 6px;font-size:13px;color:#9a7b88}}.filt button{{border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:12px;font-size:12px;padding:3px 10px}}.filt button.on{{background:#d0567f;color:#fff;border-color:#d0567f}}.ubdg{{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;color:#c0587f;background:#ffe8ee;border-radius:8px;padding:0 6px}}.nsh2{{font-size:12px;color:#a0466a;margin:2px 0 4px}}.post.replied{{box-shadow:inset 3px 0 0 #7ec8a0}}.post.unreplied{{box-shadow:inset 3px 0 0 #f3a0b8}}.post{{border-top:1px dashed #f3c6d5;padding:4px 6px;border-radius:10px;transition:background .4s}}.post.rd{{background:#eef7ee}}.post.rd>.md::after{{content:' 👀既読';color:#5a9a5a}}.rp{{font-size:13px;background:#fff6f9;border-radius:10px;padding:2px 8px;margin:3px 0}}
.mkOv{{position:fixed;inset:0;z-index:2147483100;background:#0007;display:flex;align-items:flex-end;justify-content:center}}.mkBox{{background:#fff;width:100%;max-width:420px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom)+14px)}}.mkH{{font-size:16px;font-weight:800;color:#c0587f}}.mkSub{{font-size:12px;color:#9a7b88;margin:4px 0 8px}}.mkCur{{margin-bottom:8px;font-size:13px}}.mkChip{{border:1px solid #f3c6d5;background:#fff6f9;border-radius:14px;padding:4px 8px;margin:2px;font-size:16px}}.mkG{{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}}.mkE{{width:40px;height:40px;border:1px solid #f3c6d5;background:#fff;border-radius:12px;font-size:22px;padding:0}}.mkE.on{{background:#ffd6e4;border-color:#d0567f}}.mkAdd{{display:flex;gap:6px;margin:8px 0}}.mkIn{{flex:1;border:1px solid #f3c6d5;border-radius:12px;padding:8px;font-size:18px}}.mkAddB,.mkOk{{border:0;background:#d0567f;color:#fff;border-radius:12px;padding:8px 12px;font-weight:800}}.mkDef,.mkX{{border:1px solid #f3c6d5;background:#fff;color:#a0466a;border-radius:12px;padding:8px 12px;margin-top:6px}}.mkAct{{display:flex;gap:8px;margin-top:8px}}.mkAct .mkOk{{flex:1}}.mkGear{{font-size:14px!important;opacity:.85}}.micb{{border:1px solid #f3c6d5;background:#fff;border-radius:14px;font-size:16px;padding:4px 8px;flex:none}}.micb.on{{background:#ffe08a;border-color:#d0567f;animation:micPulse 1s infinite}}.micHint{{width:100%;font-size:12px;color:#a0466a;background:#fff6f9;border-radius:10px;padding:4px 8px;margin-top:2px}}@keyframes micPulse{{0%,100%{{transform:scale(1)}}50%{{transform:scale(1.08)}}}}.act{{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:4px 0}}.act button{{border:1px solid #f3c6d5;background:#fff;border-radius:14px;font-size:15px;padding:2px 8px}}.act button.on{{background:#ffd6e4;border-color:#d0567f}}
.act input{{flex:1;min-width:120px;border:1px solid #f3c6d5;border-radius:12px;padding:5px 8px;font-size:16px}}

.mnSec{{margin:8px 0 10px;border:1px solid #ffd0a8;border-radius:14px;background:linear-gradient(180deg,#fff8f0,#fff);padding:0 8px 8px}}
.mnSec>summary{{cursor:pointer;font-weight:800;color:#c45c26;padding:8px 4px;list-style-position:inside;font-size:15px}}
.mnWrap{{padding:4px 2px 8px}}.mnHero{{background:#fff3e6;border-radius:12px;padding:10px;margin:8px 0;color:#5a3a45;font-size:14px}}
.mnCount{{font-size:18px;margin:6px 0;color:#c45c26}}.mnSub{{font-size:12px;color:#9a7b88}}
.mnRules{{margin:6px 0;border:1px dashed #f0c9a0;border-radius:12px;padding:4px 8px;background:#fff}}
.mnRules summary{{cursor:pointer;font-weight:800;color:#c45c26;font-size:14px}}.mnRulesB{{font-size:13px;line-height:1.55;color:#5a3a45;padding:6px 2px 8px}}
.mnRulesB ul{{padding-left:18px;margin:4px 0}}
.mnList{{list-style:none;margin:0;padding:0;max-height:min(50vh,340px);overflow:auto}}
.mnList li{{display:flex;align-items:center;gap:6px;padding:5px 2px;border-bottom:1px dashed #ffe4cc;font-size:13px}}
.mnList i{{flex:none;width:22px;height:22px;border-radius:11px;background:#ff9a5a;color:#fff;font-style:normal;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}}
.mnList b{{flex:1}}.mnList em{{font-style:normal;color:#c45c26;font-weight:800}}
.mnTier{{font-size:11px;background:#ffe8d6;color:#c45c26;border-radius:8px;padding:1px 6px;font-weight:700}}
.mnRew{{margin:8px 0;padding:8px;border-radius:12px;background:#fff8f0;border:1px solid #ffd0a8;font-size:13px}}
.mnRewH{{font-weight:800;color:#c45c26;margin-bottom:6px}}.mnRewT{{margin:6px 0}}.mnRewT ul{{margin:4px 0;padding-left:18px}}
.mnBagBar{{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:8px;font-size:12px}}
.mnBagB{{border:1px solid #ffd0a8;background:#fff;color:#c45c26;border-radius:12px;padding:3px 8px;font-size:12px;font-weight:700}}.mnBagMini{{margin-left:6px;border:1px solid #ffd0a8;background:#fff8f0;border-radius:10px;font-size:12px;padding:1px 6px}}
.mnOv{{position:fixed;inset:0;z-index:2147483200;background:#0007;display:flex;align-items:flex-end;justify-content:center}}
.mnBox{{background:#fff;width:100%;max-width:420px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom)+14px)}}
.mnH{{font-size:16px;font-weight:800;color:#c45c26}}.mnInv{{display:flex;flex-direction:column;gap:6px;margin:8px 0}}
.mnItem{{text-align:left;border:1px solid #ffd0a8;background:#fff8f0;border-radius:12px;padding:8px 10px}}.mnItem.on{{background:#ffe0c2;border-color:#c45c26}}
.mnItem b{{display:block;font-size:14px}}.mnItem small{{color:#9a7b88}}
.mnX{{display:block;width:100%;margin-top:8px;border:0;border-radius:14px;padding:12px;font-weight:800;background:#c45c26;color:#fff}}
/* cosmetics */
.mem.rw-bg{{background:linear-gradient(135deg,#fff0e0,#ffd7b5 40%,#ffe8d6)!important;border-radius:12px;padding:4px 6px}}
.mem.rw-frame .avw,.mem.rw-frame .av{{box-shadow:0 0 0 3px #e67e22,0 0 0 6px #f5d76e55!important;border-radius:50%}}
.mem.rw-frame .avw{{background:url(img/rewards/momiji-frame.svg) center/contain no-repeat}}
.mem.rw-icon .avw::after{{content:"";position:absolute;right:-4px;top:-4px;width:16px;height:16px;background:url(img/rewards/momiji-icon.svg) center/contain no-repeat;pointer-events:none}}
.mem.rw-sticker{{position:relative}}
.mem.rw-sticker::after{{content:"";position:absolute;right:4px;top:4px;width:28px;height:28px;background:url(img/rewards/momiji-sticker.svg) center/contain no-repeat;opacity:.9;pointer-events:none}}
.mem.rw-fx{{position:relative;overflow:hidden}}
.mem.rw-fx::before{{content:"🍁🍂🍁";position:absolute;left:0;right:0;top:0;font-size:12px;opacity:.55;animation:leafFall 6s linear infinite;pointer-events:none;letter-spacing:8px}}
@keyframes leafFall{{0%{{transform:translateY(-120%)}}100%{{transform:translateY(220%)}}}}
#yzs{{display:block;width:100%;min-height:44px;margin:12px 0 0;background:#fff;color:#d0567f;border:2px solid #d0567f;border-radius:22px;font-size:16px;font-weight:bold}}</style></head>
<body><header><h1>💖 ゆず＆みんなの思い出</h1><div class="sub">エイジ専用・最終更新 {now}</div><button id="rl" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄 更新</button></header><button id="rlf" aria-label="更新" onclick="location.replace(location.pathname+'?v='+Date.now())">🔄</button><main>{body}</main>'''+JS
open(os.path.join(D,'index.html'),'w').write(page)
SWV='omoide-v27'
open(os.path.join(D,'sw.js'),'w').write("const C='"+SWV+"';self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});")
json.dump({"name":"ゆず＆みんなの思い出","short_name":"みんなの思い出","start_url":"./","scope":"./","display":"standalone","background_color":"#fff0f5","theme_color":"#ffb3c8","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open(os.path.join(D,'manifest.webmanifest'),'w'),ensure_ascii=False)
dts=[(d,w) for d,w,_ in mem if re.match(r'\d{4}-\d\d-\d\d$',d)]
os.makedirs(os.path.join(D,'data'),exist_ok=True);json.dump({'latest':max(dts)[0] if dts else '','who':plain(max(dts)[1]) if dts else '','posts':len(mem)},open(os.path.join(D,'data','latest.json'),'w'),ensure_ascii=False)
posts={}; 
for _w,_es in people.items():posts[plain(_w)]=len(_es)
json.dump({'posts':posts,'updated':now},open(os.path.join(D,'data','posts.json'),'w'),ensure_ascii=False)
# --- monthly ranking snapshots (post counts by month; live tally adds reactions/replies on device)
os.makedirs(os.path.join(D,'data','monthly'),exist_ok=True)
os.makedirs(os.path.join(D,'data','rewards'),exist_ok=True)
from collections import defaultdict
by_m=defaultdict(lambda:defaultdict(int))
for d,w,_ in mem:
    if not re.match(r'\d{4}-\d{2}-\d{2}$',d):continue
    who=plain(w)
    if who=='ゆず':continue
    by_m[d[:7]][who]+=10  # +10pt per post day-entry (same as client post count *10)
# competition rank helper
def comp_rank(score_map):
    rows=sorted(({'name':n,'pts':p} for n,p in score_map.items()),key=lambda r:(-r['pts'],r['name']))
    out=[];i=0
    while i<len(rows):
        j=i
        while j<len(rows) and rows[j]['pts']==rows[i]['pts']:j+=1
        rk=i+1;tier=1 if rk<=3 else (2 if rk<=7 else 0)
        for k in range(i,j):
            r=dict(rows[k]);r['rank']=rk;r['tier']=tier;out.append(r)
        i=j
    return out
# ensure Nov stub exists (not finalized until after month end)
nov='2026-11';nov_path=os.path.join(D,'data','monthly',nov+'.json')
if not os.path.exists(nov_path):
    json.dump({'month':nov,'finalized':False,'theme':'紅葉','note':'11月スタート！ライブ集計は端末のリアクション・返事＋公開投稿。確定スナップショットは月末以降にゆずが公開するよ。','ranking':[],'updated':now},open(nov_path,'w'),ensure_ascii=False,indent=1)
# finalize previous months if any (post-only baseline when missing)
jst=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
cur_ym=jst.strftime('%Y-%m')
for ym,sc in sorted(by_m.items()):
    if ym<'2026-11':continue  # monthly system starts Nov 2026
    if ym>=cur_ym:continue     # current/future: live only
    path=os.path.join(D,'data','monthly',ym+'.json')
    prev=None
    if os.path.exists(path):
        try:prev=json.load(open(path))
        except Exception:prev=None
    if prev and prev.get('finalized'):continue
    ranking=comp_rank(sc)
    # grant rewards into inventory (merge, never delete owned)
    rew_path=os.path.join(D,'data','rewards',ym+'.json')
    inv_path=os.path.join(D,'data','inventory.json')
    inv=json.load(open(inv_path)) if os.path.exists(inv_path) else {'members':{}}
    inv.setdefault('members',{})
    rew=json.load(open(rew_path)) if os.path.exists(rew_path) else None
    if rew:
        t1=[x['id'] for x in rew.get('tiers',{}).get('1',{}).get('items',[])]
        t2=[x['id'] for x in rew.get('tiers',{}).get('2',{}).get('items',[])]
        for r in ranking:
            ids=t1 if r['tier']==1 else (t2 if r['tier']==2 else [])
            if not ids:continue
            m=inv['members'].setdefault(r['name'],{'owned':[],'equip':{}})
            owned=m.setdefault('owned',[])
            for i in ids:
                if i not in owned:owned.append(i)
        inv['updated']=now
        json.dump(inv,open(inv_path,'w'),ensure_ascii=False,indent=1)
    json.dump({'month':ym,'finalized':True,'source':'posts+publish','ranking':ranking,'updated':now},open(path,'w'),ensure_ascii=False,indent=1)
print('built',len(mem),'memories')
if '--push' in sys.argv:
    subprocess.run(['git','-C',D,'add','-A']);subprocess.run(['git','-C',D,'commit','-qm','update '+now]);subprocess.run(['git','-C',D,'push','-q'],check=True)
