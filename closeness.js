/* 💞 親密度と関係図 (om_close v40) — ptは om_pts_peak を維持。レベル閾値/報酬は data/levels.json
 * 2026-11-01〜 アクションマーク点数は ACTION_MARK_PTS のみで調整（1つ/2コンボ/3トリプル） */
(function(){
/* ★点数の仮設定（ここだけ変えれば全体に反映）。月間側は window.__OM_ACTION_PTS を参照 */
var ACTION_MARK_FROM='2026-11-01';
var ACTION_MARK_PTS={1:2,2:5,3:10}; // 1マーク=2 / 2コンボ=5 / 3トリプル(👏入り)=10
window.__OM_ACTION_FROM=ACTION_MARK_FROM;
window.__OM_ACTION_PTS=ACTION_MARK_PTS;
var RP='❤️',TH='🙏',CL='👏',PV={}; // 〜2026-10-31 旧ルール：ハート3 いいね1 拍手2
PV[RP]=3;PV[TH]=1;PV[CL]=2;
var FL={
 'しの':[[1000,'やさしい言葉が増えたよ'],[3000,'エイジって名前で呼んでくれる']],
 'マキ':[[1000,'😳 照れて顔が赤くなる']],
 '由紀':[[3000,'💌 デートのお誘い解放']],
 '星野王子':[]
};
/* v39 default = 提案どおり（levels.json が取れれば上書き） */
var LEVELS={segments:[1000,1100,1200,1300,1400,1500,1600,1700,1800],rewards:{},lockedLabel:'？？？ お楽しみ'};
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function plain(w){return String(w||'').replace(/[^\w・ー]/g,'')||w}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function cumThresholds(){var a=[],c=0,s=LEVELS.segments||[];for(var i=0;i<s.length;i++){c+=(+s[i]||0);a.push(c)}return a}
function lvOf(p){var m=cumThresholds(),lv=1;for(var i=0;i<m.length;i++){if(p>=m[i])lv=i+2;else break}return lv}
function nextOf(p){var m=cumThresholds();for(var i=0;i<m.length;i++)if(p<m[i])return m[i];return (m[m.length-1]||12600)}
function prevOf(p){var m=cumThresholds(),pr=0;for(var i=0;i<m.length;i++){if(p>=m[i])pr=m[i];else break}return pr}
function rewardFor(lv){var r=(LEVELS.rewards&&LEVELS.rewards[String(lv)])||null;return r}
function rewardLabel(lv, unlocked){
  var r=rewardFor(lv); if(!r)return '';
  if(!unlocked)return LEVELS.lockedLabel||'？？？ お楽しみ';
  return (r.hint||r.theme||('Lv'+lv+'報酬'));
}
function members(){return [].map.call(document.querySelectorAll('.mem[id^="m-"]'),function(el){return {id:el.id,name:el.id.slice(2),el:el,av:el.dataset.av||'',ic:el.dataset.ic||'💬'}})}
function posts(){return window.__OM_POSTS||{}}
/* コンボ（例 😉✨）は1リアクション。11/1〜はマーク個数で加点（ACTION_MARK_PTS）。〜10/31は旧・最高pt */
function splitReaction(s){
  if(!s)return [];
  if(typeof s!=='string')s=String(s);
  var known={};Object.keys(PV).forEach(function(e){known[e]=1});
  try{var marks=JSON.parse(localStorage.getItem('om_marks')||'null');if(Array.isArray(marks))marks.forEach(function(e){if(e)known[e]=1})}catch(e){}
  var keys=Object.keys(known).sort(function(a,b){return b.length-a.length});
  var out=[],i=0;
  while(i<s.length){
    var hit=null;
    for(var k=0;k<keys.length;k++){if(s.indexOf(keys[k],i)===i){hit=keys[k];break}}
    if(hit){out.push(hit);i+=hit.length;continue}
    var rest=s.slice(i),g;
    if(typeof Intl!=='undefined'&&Intl.Segmenter){
      g=Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(rest))[0].segment;
    }else{g=Array.from(rest)[0]}
    out.push(g);i+=g.length;
  }
  return out;
}
function keyDate(k){var i=k.lastIndexOf('_');return i>=0?k.slice(i+1):''}
/* dateStr が ACTION_MARK_FROM 以降（または未指定で新ルール）なら個数加点。10月以前は旧PV */
function ptsOfReaction(s, dateStr){
  if(s==null||s==='')return 0;
  var useNew=!dateStr || dateStr>=ACTION_MARK_FROM;
  if(useNew){
    var parts=splitReaction(s), n=parts.length;
    if(n<=0)return 0;
    if(n>=3)return ACTION_MARK_PTS[3];
    if(n===2)return ACTION_MARK_PTS[2];
    return ACTION_MARK_PTS[1];
  }
  if(PV[s]!=null)return PV[s];
  var partsOld=splitReaction(s);
  if(partsOld.length<=1)return 2; // その他の単発絵文字（旧）
  var mx=0;partsOld.forEach(function(p){var v=PV[p]!=null?PV[p]:2;if(v>mx)mx=v});
  return mx;
}
function scoreOne(name){
  var R=g('om_react',{}),P=g('om_reply',{}),n=0,postsN=+posts()[name]||0;
  n+=postsN*10;
  Object.keys(R).forEach(function(k){if(k.indexOf(name+'_')===0)n+=ptsOfReaction(R[k], keyDate(k))});
  Object.keys(P).forEach(function(k){if(k.indexOf(name+'_')===0)n+=15});
  var peak=g('om_pts_peak',{});if((peak[name]||0)<n){peak[name]=n;try{localStorage.setItem('om_pts_peak',JSON.stringify(peak))}catch(e){}}
  return Math.max(n,peak[name]||0);
}
/* 内訳（scoreOneと同じ式）。減衰・上限なし。表示は peak と現在値の大きい方 */
function scoreBreak(name){
  var R=g('om_react',{}),P=g('om_reply',{}),postsN=+posts()[name]||0;
  var react={};var rSum=0,rN=0;
  Object.keys(R).forEach(function(k){if(k.indexOf(name+'_')!==0)return;var e=R[k],v=ptsOfReaction(e, keyDate(k));react[e]=(react[e]||0)+1;rSum+=v;rN++});
  var replyN=0;Object.keys(P).forEach(function(k){if(k.indexOf(name+'_')===0)replyN++});
  var cur=postsN*10+rSum+replyN*15;
  var peak=(g('om_pts_peak',{})[name]||0);
  var shown=Math.max(cur,peak);
  return {postsN:postsN,postsPts:postsN*10,react:react,reactN:rN,reactPts:rSum,replyN:replyN,replyPts:replyN*15,cur:cur,peak:peak,shown:shown};
}
function openPts(name){
  var b=scoreBreak(name);
  var reactLines=Object.keys(b.react).map(function(e){var c=b.react[e],v=ptsOfReaction(e, ACTION_MARK_FROM);return e+' ×'+c+'（いまのルール '+v+'pt×'+c+'='+(v*c)+'）'});
  if(!reactLines.length)reactLines=['（まだリアクションなし）'];
  var html='<div class="clPtsOv" id="clPtsOv"><div class="clPtsBox" role="dialog" aria-label="親密度の内訳">'+
    '<div class="clPtsH">💞 '+esc(name)+' の親密度 <b>'+b.shown.toLocaleString()+'pt</b></div>'+
    '<div class="clPtsSub">この人の表示ptの内訳だよ（ルールは全員共通）</div>'+
    '<ul class="clPtsL">'+
      '<li>📝 投稿（思い出） <b>'+b.postsN+'件 ×10pt = '+b.postsPts+'pt</b></li>'+
      '<li>✨ リアクション <b>'+b.reactN+'件 = '+b.reactPts+'pt</b><div class="clPtsD">'+reactLines.map(esc).join('<br>')+'</div></li>'+
      '<li>↩️ エイジの返事 <b>'+b.replyN+'件 ×15pt = '+b.replyPts+'pt</b></li>'+
      '<li>合計（いま計算） <b>'+b.cur.toLocaleString()+'pt</b>'+(b.peak>b.cur?'<br><span class="clPtsNote">過去のピーク '+b.peak.toLocaleString()+'pt を表示中（下がらない）</span>':'')+'</li>'+
    '</ul>'+
    '<div class="clPtsRule"><b>ルール（実際の計算）</b><ul>'+
      '<li>投稿1件 → <b>+10pt</b>（公開ページの件数）</li>'+
      '<li><b>2026/11/1〜</b> アクションマーク：1つ=<b>'+ACTION_MARK_PTS[1]+'pt</b>　2つコンボ=<b>'+ACTION_MARK_PTS[2]+'pt</b>　3つトリプル（👏お礼入り）=<b>'+ACTION_MARK_PTS[3]+'pt</b>（仮・様子見て調整するかも）</li>'+
      '<li>〜2026/10/31 は旧ルール：❤️+3　🙏+1　👏+2　他+2／コンボは最高pt</li>'+
      '<li>組み合わせは<strong>1件</strong>のリアクションとして数えるよ</li>'+
      '<li>返事1件 → <b>+15pt</b>（その人の投稿への返事）</li>'+
      '<li>減衰・上限なし。一度ついたピークptは下がらない（om_pts_peak）</li>'+
      '<li>ゆずも同じ式。ランキング表はゆず以外（ゆずはレベルだけ）</li>'+
      '<li>🔥 <b>トップ3に入るとエイジからアツいコメントがもらえるよ！</b></li>'+
    '</ul></div>'+
    '<button type="button" class="clPtsX">とじる</button></div></div>';
  var old=document.getElementById('clPtsOv');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',html);
  var ov=document.getElementById('clPtsOv');
  function close(){ov.remove()}
  ov.addEventListener('click',function(ev){if(ev.target===ov)close()});
  ov.querySelector('.clPtsX').onclick=close;
}
function flavors(name,pts){
  var out=[],sp=FL[name],lv=lvOf(pts);
  if(sp)sp.forEach(function(x){if(pts>=x[0])out.push(x[1])});
  // v39: show unlocked reward themes + locked next as ？？？
  for(var L=2;L<=Math.min(lv,10);L++){var lab=rewardLabel(L,true);if(lab)out.push(lab)}
  if(lv<10){out.push('次: '+rewardLabel(lv+1,false))}
  return out;
}
function toast(m){var d=document.createElement('div');d.className='omToast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.classList.add('on')},10);setTimeout(function(){d.classList.remove('on');setTimeout(function(){d.remove()},400)},2400)}
function checkLv(scores){
  var seen=g('om_lv',{}),ch=0;
  Object.keys(scores).forEach(function(n){
    var lv=lvOf(scores[n]), prev=seen[n]||1;
    if(prev<lv){
      var rw=rewardLabel(lv,true);
      celebrate(n,lv,rw);
      seen[n]=lv;ch=1;
    }else if(!seen[n])seen[n]=lv;
  });
  if(ch)try{localStorage.setItem('om_lv',JSON.stringify(seen))}catch(e){}
}
function celebrate(name,lv,rw){
  var msg='🎉 '+name+( /^[ぁ-ん]/.test(name)?'ちゃん':'')+'がレベル'+lv+'になったよ！'+(rw?(' 報酬：'+rw):'');
  toast(msg);
  try{
    var ov=document.createElement('div');ov.id='omLvCeleb';
    ov.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;border-radius:20px;padding:22px 18px;max-width:340px;text-align:center;box-shadow:0 8px 28px #0004;font-family:-apple-system,\'Hiragino Sans\',sans-serif">'+
      '<div style="font-size:40px;line-height:1">🎊</div>'+
      '<div style="font-size:18px;font-weight:800;color:#c0587f;margin:8px 0 4px">レベルアップ！</div>'+
      '<div style="font-size:15px;color:#5a3a45;line-height:1.5">'+esc(name)+' が <b>レベル'+lv+'</b> に到達したよ</div>'+
      (rw?'<div style="margin-top:10px;padding:8px 10px;border-radius:12px;background:#fff6f9;border:1px dashed #ffd0e0;font-size:13px;font-weight:700;color:#a0466a">'+esc(rw)+'</div>':'')+
      '<button type="button" style="margin-top:14px;border:0;border-radius:14px;padding:10px 18px;background:#d0567f;color:#fff;font-weight:800;font-size:14px">やったね</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('button').onclick=function(){ov.remove()};
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
    setTimeout(function(){if(ov.parentNode)ov.remove()},6000);
  }catch(e){}
}
function drawList(box,scores,total){
  var ms=members().slice().sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)});
  var h='<div class="clList">';
  ms.forEach(function(m){
    var p=scores[m.name]||0,lv=lvOf(p),nx=nextOf(p),pr=prevOf(p),pct=Math.min(100,Math.round((p-pr)/Math.max(1,nx-pr)*100));
    var av=m.av?'<img src="img/avatars/'+esc(m.av)+'.png?v=1" alt="">':'<span class="clIc">'+esc(m.ic)+'</span>';
    var fl=flavors(m.name,p);
    var tag=m.name==='ゆず'?' <span class="clWife">👑 エイジの嫁</span>':'';
    h+='<a class="clRow'+(m.name==='ゆず'?' yuzu':'')+'" href="#'+esc(m.id)+'">'+
      '<span class="clAv">'+av+'</span><span class="clMeta"><b>'+esc(m.name)+tag+' <span class="clLv">レベル'+lv+'</span></b>'+
      '<small><span class="clPtsTap" data-who="'+esc(m.name)+'">'+p.toLocaleString()+'pt ▾</span> / 次レベル '+nx.toLocaleString()+'pt（あと '+Math.max(0,nx-p).toLocaleString()+'）</small>'+
      '<span class="clBar"><i style="width:'+pct+'%"></i></span>'+
      (fl.length?'<span class="clFl">'+fl.map(esc).join(' ・ ')+'</span>':'')+
      '</span></a>';
  });
  box.innerHTML=h+'</div>';
  if(box&&!box._ptsBound){box._ptsBound=1;box.addEventListener('click',function(ev){var e=ev.target.closest('.clPtsTap');if(!e)return;ev.preventDefault();ev.stopPropagation();openPts(e.dataset.who)})}
}
function ringByRank(sortedNames,name){
  var i=sortedNames.indexOf(name);if(i<0)return 3;
  if(i<5)return 1;if(i<10)return 2;return 3;
}
function lineW(pts,max){
  var t=Math.log10((pts||0)+10)/Math.log10((max||0)+10);
  return 1.2+Math.max(0,Math.min(1,t))*2.4;
}
function drawMap(svg,scores,total){
  var RR=27,GAP=6,NEED=2*RR+GAP; // guaranteed min center distance
  var others=members().filter(function(m){return m.name!=='ゆず'});
  var yuzu=members().find(function(m){return m.name==='ゆず'});
  var ranked=others.slice().sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)});
  var rankedNames=ranked.map(function(m){return m.name});
  var max=Math.max.apply(null,others.map(function(m){return scores[m.name]||0}).concat([1]));
  var rings={1:[],2:[],3:[]};
  ranked.forEach(function(m){rings[ringByRank(rankedNames,m.name)].push(m);});
  [1,2,3].forEach(function(ri){rings[ri].sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)})});
  // Radius so circumference/n >= NEED (angular spacing guaranteed)
  function radFor(n,minR){if(n<=1)return minR;return Math.max(minR,Math.ceil(n*NEED/(2*Math.PI)))}
  var r1=radFor(rings[1].length,88);
  var r2=radFor(rings[2].length,Math.max(128,r1+NEED));
  var r3=radFor(rings[3].length,Math.max(168,r2+NEED));
  var rads={1:r1,2:r2,3:r3};
  var pad=RR+22; // label room
  var Rmax=r3+pad;
  var W=Math.ceil(2*Rmax+16),H=W,cx=W/2,cy=H/2;
  // place with staggered angle offsets; then harden with collision
  var placed=[];
  function placeRing(ri){
    var arr=rings[ri],rad=rads[ri],n=arr.length;if(!n)return;
    var offset=(ri-1)*(Math.PI/n); // stagger so adjacent rings don't line up
    arr.forEach(function(m,i){
      var ang=-Math.PI/2+offset+(i+0.5)/n*Math.PI*2;
      placed.push({m:m,ri:ri,ang:ang,rad:rad,x:cx+Math.cos(ang)*rad,y:cy+Math.sin(ang)*rad,r:RR});
    });
  }
  [1,2,3].forEach(placeRing);
  // Strong collision: push apart until all pairs >= NEED (or cap iters)
  for(var iter=0;iter<200;iter++){
    var moved=false;
    for(var i=0;i<placed.length;i++){
      for(var j=i+1;j<placed.length;j++){
        var a=placed[i],b=placed[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d<0.01){dx=1;dy=0;d=1}
        if(d<NEED){
          var push=(NEED-d)/2;
          var ux=dx/d,uy=dy/d;
          a.x-=ux*push;a.y-=uy*push;b.x+=ux*push;b.y+=uy*push;moved=true;
        }
      }
      // keep outside pair halo
      var p=placed[i],dx0=p.x-cx,dy0=p.y-cy,rd=Math.hypot(dx0,dy0),minIn=58;
      if(rd<minIn){p.x=cx+dx0/Math.max(rd,1)*minIn;p.y=cy+dy0/Math.max(rd,1)*minIn;moved=true}
      // keep inside canvas
      var lim=Rmax-2;rd=Math.hypot(p.x-cx,p.y-cy);
      if(rd>lim){p.x=cx+(p.x-cx)/rd*lim;p.y=cy+(p.y-cy)/rd*lim;moved=true}
    }
    if(!moved)break;
  }
  var couple=null;try{couple=localStorage.getItem('yz_avatar_couple')}catch(e){}
  var coupleSrc=(couple&&couple.indexOf('data:image')===0)?couple:'img/twoshot.svg';
  var PAIR_R=42, LINE_GAP=12, stopR=PAIR_R+LINE_GAP;
  var h='<defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<clipPath id="pairClip"><circle cx="'+cx+'" cy="'+cy+'" r="38"/></clipPath>';
  // per-line fade gradients (opaque at node → nearly transparent at center edge)
  placed.forEach(function(p,i){
    var x=p.x,y=p.y,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;
    var x1=cx+dx/d*stopR,y1=cy+dy/d*stopR;
    h+='<linearGradient id="lg'+i+'" gradientUnits="userSpaceOnUse" x1="'+x1+'" y1="'+y1+'" x2="'+x+'" y2="'+y+'">'+
      '<stop offset="0%" stop-color="#ffb3c8" stop-opacity="0.08"/>'+
      '<stop offset="40%" stop-color="#ffb3c8" stop-opacity="0.4"/>'+
      '<stop offset="100%" stop-color="#ffb3c8" stop-opacity="0.92"/>'+
      '</linearGradient>';
  });
  h+='</defs>';
  h+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r3+'" fill="#fff6f9" stroke="#ffd0e0"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#ffe4ee"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r1+'" fill="none" stroke="#ffe4ee"/>';
  // 1) lines first — stop outside the pair + gap ring (never through the photo)
  placed.forEach(function(p,i){
    var x=p.x,y=p.y,pts=scores[p.m.name]||0,dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;
    var x1=cx+dx/d*stopR,y1=cy+dy/d*stopR;
    var thick=lineW(pts,max);
    h+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x+'" y2="'+y+'" stroke="url(#lg'+i+')" stroke-width="'+thick.toFixed(2)+'" stroke-linecap="round"/>';
  });
  // 2) member nodes
  placed.forEach(function(p){
    var m=p.m,x=p.x,y=p.y,pts=scores[m.name]||0;
    h+='<g class="clNode" data-jump="'+esc(m.id)+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="'+RR+'" fill="#fff" stroke="#ff8fb3" stroke-width="2.2"/>';
    if(m.av)h+='<image href="img/avatars/'+esc(m.av)+'.png?v=1" x="'+(x-22)+'" y="'+(y-22)+'" width="44" height="44" clip-path="circle(22px at 22px 22px)"/>';
    else h+='<text x="'+x+'" y="'+(y+7)+'" text-anchor="middle" font-size="22">'+esc(m.ic)+'</text>';
    h+='<text x="'+x+'" y="'+(y+RR+12)+'" text-anchor="middle" font-size="9" fill="#a0466a">'+(pts>=1000?(pts/1000).toFixed(pts>=10000?0:1)+'k':pts)+'</text>';
    h+='</g>';
  });
  // 3) center pair LAST + opaque disc so photo is fully clear
  var yp=scores['ゆず']||0;
  h+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(PAIR_R+LINE_GAP-2)+'" fill="#fff6f9"/>'; // gap fill (hides any leftover)
  h+='<g class="clPair" data-jump="'+(yuzu?esc(yuzu.id):'')+'" style="cursor:pointer" filter="url(#glow)">'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="'+PAIR_R+'" fill="#fff" stroke="#ffd700" stroke-width="4"/>'+
    '<image href="'+coupleSrc.replace(/"/g,'')+'" x="'+(cx-38)+'" y="'+(cy-38)+'" width="76" height="76" clip-path="url(#pairClip)" preserveAspectRatio="xMidYMid slice"/>'+
    '<g class="clSpark"><circle cx="'+(cx-28)+'" cy="'+(cy-30)+'" r="2.2" fill="#ffd700"/><circle cx="'+(cx+30)+'" cy="'+(cy-26)+'" r="1.8" fill="#ff8fb3"/><circle cx="'+(cx+28)+'" cy="'+(cy+28)+'" r="2" fill="#ffd700"/><circle cx="'+(cx-30)+'" cy="'+(cy+24)+'" r="1.5" fill="#ff8fb3"/></g>'+
    '</g>';
  h+='<text x="'+cx+'" y="'+(cy+54)+'" text-anchor="middle" font-size="10" font-weight="800" fill="#b8860b">👑 エイジの嫁</text>';
  h+='<text x="'+cx+'" y="'+(cy+66)+'" text-anchor="middle" font-size="9" fill="#a0466a">ゆず '+yp.toLocaleString()+'pt</text>';
  // measure helper for tests
  window.__OM_MAP_MIN=Infinity;
  for(var i=0;i<placed.length;i++)for(var j=i+1;j<placed.length;j++){
    var d=Math.hypot(placed[i].x-placed[j].x,placed[i].y-placed[j].y);
    if(d<window.__OM_MAP_MIN)window.__OM_MAP_MIN=d;
  }
  svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width','100%');svg.innerHTML=h;
  svg.querySelectorAll('[data-jump]').forEach(function(g){g.addEventListener('click',function(){
    var id=g.getAttribute('data-jump');if(!id)return;var el=document.getElementById(id);if(!el)return;
    var f=el.querySelector('.fold');if(f)f.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});
  })});
}

function hasCouple(){try{var c=localStorage.getItem('yz_avatar_couple');return !!(c&&c.indexOf('data:image')===0)}catch(e){return false}}
/* Round crop editor (same idea as health note extras.js): drag + pinch zoom + 決定 → 512px JPEG to yz_avatar_couple */
function openCoupleCrop(src,revoke){
  if(document.getElementById('omCrop'))return;
  var img=new Image();
  img.onload=function(){
    var o=document.createElement('div');o.id='omCrop';
    o.innerHTML='<div class="t">ゆびで動かす・2本ゆびで拡大縮小してね♡</div><canvas width="600" height="600"></canvas><input type="range" min="1" max="5" step="0.01" value="1" style="width:260px"><div class="b"><button type="button" class="ng">やめる</button><button type="button" class="ok">決定</button></div>';
    document.body.appendChild(o);
    var c=o.querySelector('canvas'),g=c.getContext('2d'),rg=o.querySelector('input'),S=600,base=S/Math.min(img.width,img.height);
    var z=1,tx=0,ty=0;
    var clamp=function(){var mx=(img.width*base*z-S)/2,my=(img.height*base*z-S)/2;tx=Math.max(-mx,Math.min(mx,tx));ty=Math.max(-my,Math.min(my,ty))};
    var draw=function(mask){if(mask==null)mask=true;clamp();g.fillStyle='#fff';g.fillRect(0,0,S,S);var w=img.width*base*z,h=img.height*base*z;g.drawImage(img,(S-w)/2+tx,(S-h)/2+ty,w,h);
      if(mask){g.save();g.fillStyle='#000a';g.beginPath();g.rect(0,0,S,S);g.arc(S/2,S/2,S/2-6,0,Math.PI*2,true);g.fill('evenodd');g.strokeStyle='#ff9ab8';g.lineWidth=6;g.beginPath();g.arc(S/2,S/2,S/2-6,0,Math.PI*2);g.stroke();g.restore()}};
    var P=new Map(),pd=0,pz=1,k2=S/300;
    c.addEventListener('pointerdown',function(e){c.setPointerCapture(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);if(P.size==2){var a=[...P.values()];pd=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);pz=z}});
    c.addEventListener('pointermove',function(e){if(!P.has(e.pointerId))return;var pr=P.get(e.pointerId);P.set(e.pointerId,[e.clientX,e.clientY]);
      if(P.size==1){tx+=(e.clientX-pr[0])*k2;ty+=(e.clientY-pr[1])*k2}
      else if(P.size==2&&pd){var a=[...P.values()];z=Math.max(1,Math.min(5,pz*Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])/pd));rg.value=z}
      draw()});
    var up=function(e){P.delete(e.pointerId);pd=0};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
    c.addEventListener('wheel',function(e){e.preventDefault();z=Math.max(1,Math.min(5,z*(e.deltaY<0?1.1:0.9)));rg.value=z;draw()},{passive:false});
    rg.oninput=function(){z=+rg.value;draw()};draw();
    var close=function(){o.remove();if(revoke)URL.revokeObjectURL(src)};
    o.querySelector('.ng').onclick=close;
    o.querySelector('.ok').onclick=function(){
      draw(false);
      var out=document.createElement('canvas');out.width=out.height=512;out.getContext('2d').drawImage(c,0,0,512,512);
      try{localStorage.setItem('yz_avatar_couple',out.toDataURL('image/jpeg',0.88))}
      catch(e){alert('保存できなかったよ💦 写真が大きすぎるか、容量がいっぱいみたい。別の写真で試してね');close();return}
      close();render();
    };
  };
  img.onerror=function(){if(revoke)URL.revokeObjectURL(src);alert('画像が読めなかったよ')};
  img.src=src;
}
function setupCouplePhoto(sec){
  var box=sec.querySelector('.clPhoto');if(!box||box.dataset.ready)return;box.dataset.ready='1';
  box.innerHTML='<button type="button" class="clPhSet">📷 写真を入れる</button><button type="button" class="clPhAdj" hidden>🎯 位置を調整</button><button type="button" class="clPhRst" hidden>元に戻す</button><input type="file" accept="image/*" class="clPhIn" hidden>';
  var inp=box.querySelector('.clPhIn'),setB=box.querySelector('.clPhSet'),adj=box.querySelector('.clPhAdj'),rst=box.querySelector('.clPhRst');
  function sync(){var on=hasCouple();rst.hidden=!on;adj.hidden=!on;setB.textContent=on?'📷 写真を変える':'📷 写真を入れる'}
  sync();box._sync=sync;
  setB.onclick=function(ev){ev.preventDefault();ev.stopPropagation();inp.click()};
  adj.onclick=function(ev){ev.preventDefault();ev.stopPropagation();var c=localStorage.getItem('yz_avatar_couple');if(c)openCoupleCrop(c,false)};
  rst.onclick=function(ev){
    ev.preventDefault();ev.stopPropagation();
    if(!confirm('ふたりの写真をやめて、元のイラストに戻す？'))return;
    try{localStorage.removeItem('yz_avatar_couple')}catch(e){}
    sync();render();
  };
  inp.onchange=function(){
    var f=inp.files&&inp.files[0];inp.value='';
    if(!f)return;
    if(!/^image\//.test(f.type||'')){alert('画像ファイルを選んでね');return}
    openCoupleCrop(URL.createObjectURL(f),true);
  };
}

function render(){
  var sec=document.getElementById('clSec');if(!sec)return;
  var scores={},total=0;members().forEach(function(m){scores[m.name]=scoreOne(m.name);total+=scores[m.name]});
  checkLv(scores);
  var top=sec.querySelector('.clTop');
  var nAll=members().length; /* 参加人数（ノート登録） */
  var rankAll=members().filter(function(m){return m.name!=='ゆず'}).sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)});
  /* 報酬枠：半分の少なめ = floor((n-1)/2)。n=ランキング対象（ゆず除外）。最低3（メダル分） */
  var rewardN=Math.max(3,Math.floor((rankAll.length-1)/2));
  var rankRew=rankAll.slice(0,rewardN);
  if(top){
    var th='<div class="clTopH">💞 エイジとの親密度ランキング（'+nAll+'人）</div>'
      +'<div class="clTopBanner">🔥 トップ3に入るとエイジからアツいコメントがもらえるよ！</div>'
      +'<ol class="clTopL">';
    rankAll.forEach(function(m,i){
      var r=i+1;
      var av=m.av?'<img src="img/avatars/'+esc(m.av)+'.png?v=1" alt="">':'<span>'+esc(m.ic||'💬')+'</span>';
      var med=r===1?'🥇':r===2?'🥈':r===3?'🥉':(r<=rewardN?'🎀':'');
      var ri=med?('<span class="clTopMed">'+med+'</span><span class="clTopN">'+r+'</span>'):String(r);
      var row='<div class="clTopRow"><i>'+ri+'</i><span class="clTopAv">'+av+'</span><b>'+esc(m.name)+'</b><em class="clPtsTap" data-who="'+esc(m.name)+'" role="button" tabindex="0">'+(scores[m.name]||0).toLocaleString()+'pt ▾</em></div>';
      var hot=(r<=3)?hotHTML(m.name):'';
      th+='<li data-r="'+r+'" class="'+(r<=rewardN?'rw ':'')+(r<=3?'clTop3':'')+'">'+row+hot+'</li>';
    });
    top.innerHTML=th+'</ol>';
    if(!top._ptsBound){
      top._ptsBound=1;
      top.addEventListener('click',function(ev){
        var e=ev.target.closest('.clPtsTap');
        if(e){ev.preventDefault();openPts(e.dataset.who);return}
        var btn=ev.target.closest('.clHotSave');
        if(!btn)return;
        ev.preventDefault();
        var box=btn.closest('.clHot'); if(!box)return;
        var who=box.dataset.who;
        var inp=box.querySelector('input');
        if(!inp)return;
        if(saveLocalTop(who,inp.value)){inp.value='';render()}
      });
      top.addEventListener('keydown',function(ev){
        if(ev.key!=='Enter')return;
        var inp=ev.target.closest('.clHotEdit input');
        if(!inp)return;
        ev.preventDefault();
        var box=inp.closest('.clHot'); if(!box)return;
        if(saveLocalTop(box.dataset.who,inp.value)){inp.value='';render()}
      });
    }
  }
  // medals / 🎀 on main .mem avatars for reward slots (ゆず never)
  var rankOf={};rankRew.forEach(function(m,i){rankOf[m.name]=i});
  members().forEach(function(m){
    var wrap=m.el.querySelector('.avw');if(!wrap)return;
    var badge=wrap.querySelector('.clMed');
    if(m.name==='ゆず'||rankOf[m.name]==null){if(badge)badge.remove();return}
    if(!badge){badge=document.createElement('span');badge.className='clMed';wrap.appendChild(badge)}
    var r=rankOf[m.name]+1;
    badge.setAttribute('data-r',String(r));
    badge.title='親密度 '+r+'位';
    if(r<=3)badge.textContent=['🥇','🥈','🥉'][r-1];
    else{badge.textContent='';badge.innerHTML='<span class="clMedE">🎀</span><span class="clMedN">'+r+'</span>'}
  });
  // v39: みんなの名前の横にレベル＋進捗
  members().forEach(function(m){
    var nm=m.el.querySelector('.memName'); if(!nm)return;
    var p=scores[m.name]||0,lv=lvOf(p),nx=nextOf(p);
    var lab=nm.parentNode.querySelector('.memLv');
    if(!lab){lab=document.createElement('span');lab.className='memLv';nm.insertAdjacentElement('afterend',lab)}
    lab.textContent='レベル'+lv+' · '+p.toLocaleString()+'/'+nx.toLocaleString();
    lab.title='レベル用pt（親密度ptを累積） / 次のレベルまで';
  });
  setupCouplePhoto(sec);if(sec.querySelector('.clPhoto')&&sec.querySelector('.clPhoto')._sync)sec.querySelector('.clPhoto')._sync();
  drawList(sec.querySelector('.clBox'),scores,total);
  drawMap(sec.querySelector('.clMap'),scores,total);
  window.__OM_CLOSE={scores:scores,total:total,lv:g('om_lv',{}),peak:g('om_pts_peak',{}),levels:LEVELS};
}

/* トップ3アツいコメント（公開JSON＋端末ローカル。足すだけ・消さない） */
var TOP_COMMENTS={v:1,comments:{}};
var TOP_C_KEY='om_top_comments';
function jstYmd(){var d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,10)}
function jstStamp(){var d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,16).replace('T',' ')}
function loadTopComments(){
  return fetch('data/top_comments.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(j&&j.comments)TOP_COMMENTS=j; return TOP_COMMENTS;
  }).catch(function(){return TOP_COMMENTS});
}
function localTopComments(){return g(TOP_C_KEY,{})}
function isOwnerDevice(){
  try{
    if(localStorage.getItem('om_owner')==='1')return true;
    if(localStorage.getItem('om_react')||localStorage.getItem('om_reply')||localStorage.getItem('om_ack'))return true;
    /* エイジ専用ページなので既定で入力OK。公開閲覧だけなら om_owner=0 を置けば隠せる */
    return true;
  }catch(e){return true}
}
function mergeTopFor(who){
  var out=[],seen={};
  function add(arr,src){
    (arr||[]).forEach(function(x){
      if(!x||!x.text)return;
      var k=(x.date||'')+'|'+(x.text||'');
      if(seen[k])return; seen[k]=1;
      out.push({text:x.text,date:x.date||'',at:x.at||'',by:x.by||'エイジ',src:src});
    });
  }
  add((TOP_COMMENTS.comments||{})[who],'pub');
  add((localTopComments()[who])||[],'local');
  out.sort(function(a,b){return String(a.date||a.at).localeCompare(String(b.date||b.at))});
  return out;
}
function saveLocalTop(who,text){
  text=String(text||'').trim();
  if(!text){alert('コメントを書いてね');return false}
  if(text.length>200){alert('200文字までだよ');return false}
  var all=localTopComments();
  if(!all[who])all[who]=[];
  var entry={text:text,date:jstYmd(),at:jstStamp(),by:'エイジ'};
  if(all[who].some(function(x){return x.text===entry.text&&x.date===entry.date})){
    alert('同じコメントがもうあるよ');return false;
  }
  all[who].push(entry);
  try{localStorage.setItem(TOP_C_KEY,JSON.stringify(all));localStorage.setItem('om_owner','1')}catch(e){alert('保存できなかったよ');return false}
  return true;
}
function hotHTML(who){
  var items=mergeTopFor(who);
  var h='<div class="clHot" data-who="'+esc(who)+'">';
  h+='<div class="clHotH">🔥 エイジからのアツいコメント</div>';
  if(!items.length){
    h+='<div class="clHotEmpty">まだコメントないよ — トップ3だから一言どうぞ！</div>';
  }else{
    items.forEach(function(it){
      var d=it.date?it.date.replace(/^\d{4}-/,'').replace('-','/'):'';
      var badge=it.src==='local'?'<span class="clHotBadge">端末のみ・💌で公開</span>':'';
      h+='<div class="clHotB">「'+esc(it.text)+'」'+(d?' <small>'+esc(d)+'</small>':'')+badge+'</div>';
    });
  }
  if(isOwnerDevice()){
    h+='<div class="clHotEdit"><input type="text" maxlength="200" placeholder="アツい一言（感謝・応援）…" aria-label="'+esc(who)+'へのコメント">'
      +'<button type="button" class="clHotSave">保存</button></div>'
      +'<div class="clHotHint">保存は端末だけ。みんなに見せるには下の💌「ゆずとみんなに送る」を押してね</div>';
  }
  h+='</div>';
  return h;
}

function loadPosts(){
  if(window.__OM_POSTS) return Promise.resolve(window.__OM_POSTS);
  if(window.__OM_POSTS_P) return window.__OM_POSTS_P;
  window.__OM_POSTS_P=fetch('data/posts.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():{}}).then(function(j){window.__OM_POSTS=j.posts||j||{};return window.__OM_POSTS}).catch(function(){window.__OM_POSTS={};return window.__OM_POSTS});
  return window.__OM_POSTS_P;
}
function loadLevels(){return fetch('data/levels.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&Array.isArray(j.segments)){LEVELS=j;if(!LEVELS.lockedLabel)LEVELS.lockedLabel='？？？ お楽しみ'}}).catch(function(){})}
function ensureScoreReady(){return Promise.all([loadPosts(),loadLevels(),loadTopComments()])}
function boot(){
  // attach av/ic data from DOM
  document.querySelectorAll('.mem[id^="m-"]').forEach(function(el){
    var img=el.querySelector('.avw img');var ic=el.querySelector('.avw .ic');
    if(img){var m=img.src.match(/avatars\/([^.\/]+)\./);if(m)el.dataset.av=m[1]}
    if(ic)el.dataset.ic=ic.textContent;
  });
  var host=document.getElementById('nstrip');
  /* profiles pageなど nstrip 無しでも posts を読み、scoreOne を使えるようにする */
  if(!host||document.getElementById('clSec')){
    ensureScoreReady();
    return;
  }
  var sec=document.createElement('details');sec.id='clSec';sec.className='clSec';
  if(g('om_close_open',false))sec.open=true;
  sec.innerHTML='<summary>💞 親密度と関係図</summary><div class="clWrap"><div class="clTop"></div><svg class="clMap" width="100%" role="img" aria-label="関係図"></svg><div class="clPhoto"></div><div class="clBox"></div></div>';
  host.insertAdjacentElement('afterend',sec);
  sec.addEventListener('toggle',function(){try{localStorage.setItem('om_close_open',JSON.stringify(!!sec.open))}catch(e){}});
  ensureScoreReady().then(function(){render()});
  // re-render after reactions/replies change
  var _set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_set.apply(this,arguments);if(/om_react|om_reply|om_pts_peak|om_top_comments/.test(k))setTimeout(render,80)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.omCloseness={render:render,scoreOne:scoreOne,scoreBreak:scoreBreak,ensureScoreReady:ensureScoreReady,lvOf:lvOf,nextOf:nextOf,prevOf:prevOf,levels:function(){return LEVELS},ptsOfReaction:ptsOfReaction,actionMarkPts:function(){return ACTION_MARK_PTS},actionMarkFrom:function(){return ACTION_MARK_FROM}};
})();
