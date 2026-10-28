/* 💞 親密度と関係図 (om_close v1) — 計算は既存データのみ。ピーク値は om_pts_peak、レベルは om_lv、開閉は om_close_open */
(function(){
var RP='❤️',TH='🙏',CL='👏',PV={}; // ハート3 いいね1 拍手2
PV[RP]=3;PV[TH]=1;PV[CL]=2;
var MS=[1000,3000,5000,10000,20000,50000,100000],FL={
 'しの':[[1000,'やさしい言葉が増えたよ'],[3000,'エイジって名前で呼んでくれる']],
 'マキ':[[1000,'😳 照れて顔が赤くなる']],
 '由紀':[[3000,'💌 デートのお誘い解放']],
 '星野王子':[]
};
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function plain(w){return String(w||'').replace(/[^\w・ー]/g,'')||w}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function miles(){var a=MS.slice();while(a.length<20){var n=a[a.length-1],i=a.length-MS.length;a.push(Math.round(n*(i%2?2.5:2)))}return a}
function lvOf(p){var m=miles(),lv=1;for(var i=0;i<m.length;i++){if(p>=m[i])lv=i+2;else break}return lv}
function nextOf(p){var m=miles();for(var i=0;i<m.length;i++)if(p<m[i])return m[i];return m[m.length-1]*2}
function prevOf(p){var m=miles(),pr=0;for(var i=0;i<m.length;i++){if(p>=m[i])pr=m[i];else break}return pr}
function members(){return [].map.call(document.querySelectorAll('.mem[id^="m-"]'),function(el){return {id:el.id,name:el.id.slice(2),el:el,av:el.dataset.av||'',ic:el.dataset.ic||'💬'}})}
function posts(){return window.__OM_POSTS||{}}
function scoreOne(name){
  var R=g('om_react',{}),P=g('om_reply',{}),n=0,postsN=+posts()[name]||0;
  n+=postsN*10;
  Object.keys(R).forEach(function(k){if(k.indexOf(name+'_')===0)n+=(PV[R[k]]||0)});
  Object.keys(P).forEach(function(k){if(k.indexOf(name+'_')===0)n+=15});
  var peak=g('om_pts_peak',{});if((peak[name]||0)<n){peak[name]=n;try{localStorage.setItem('om_pts_peak',JSON.stringify(peak))}catch(e){}}
  return Math.max(n,peak[name]||0);
}
function flavors(name,pts){
  var out=[],sp=FL[name];
  if(sp)sp.forEach(function(x){if(pts>=x[0])out.push(x[1])});
  else{var lv=lvOf(pts);if(lv>=2)out.push('仲良しLv'+lv);if(lv>=3)out.push('💕 特別な絆');if(lv>=4)out.push('✨ かけがえのない相手')}
  return out;
}
function toast(m){var d=document.createElement('div');d.className='omToast';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.classList.add('on')},10);setTimeout(function(){d.classList.remove('on');setTimeout(function(){d.remove()},400)},2400)}
function checkLv(scores){
  var seen=g('om_lv',{}),ch=0;
  Object.keys(scores).forEach(function(n){var lv=lvOf(scores[n]);if((seen[n]||1)<lv){toast('🎉 '+n+(/^[ぁ-ん]/.test(n)?'ちゃん':'')+'がLv'+lv+'になったよ');seen[n]=lv;ch=1}else if(!seen[n])seen[n]=lv});
  if(ch)try{localStorage.setItem('om_lv',JSON.stringify(seen))}catch(e){}
}
function drawList(box,scores,total){
  var ms=members().slice().sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)});
  var h='<div class="clList">';
  ms.forEach(function(m){
    var p=scores[m.name]||0,lv=lvOf(p),nx=nextOf(p),pr=prevOf(p),pct=Math.min(100,Math.round((p-pr)/Math.max(1,nx-pr)*100));
    var locked=m.name==='星野王子'&&total<1000;
    var av=locked?'<span class="clSil">？？？</span>':(m.av?'<img src="img/avatars/'+esc(m.av)+'.png?v=1" alt="">':'<span class="clIc">'+esc(m.ic)+'</span>');
    var fl=locked?['まだ出会っていない…']:flavors(m.name,p);
    var tag=m.name==='ゆず'?' <span class="clWife">👑 エイジの嫁</span>':'';
    h+='<a class="clRow'+(m.name==='ゆず'?' yuzu':'')+(locked?' lock':'')+'" href="#'+esc(m.id)+'">'+
      '<span class="clAv">'+av+'</span><span class="clMeta"><b>'+(locked?'？？？':esc(m.name))+tag+'</b>'+
      '<small>Lv'+lv+' ・ '+p.toLocaleString()+'pt → 次 '+nx.toLocaleString()+'</small>'+
      '<span class="clBar"><i style="width:'+pct+'%"></i></span>'+
      (fl.length?'<span class="clFl">'+fl.map(esc).join(' ・ ')+'</span>':'')+
      '</span></a>';
  });
  box.innerHTML=h+'</div>';
}
function ringByRank(sortedNames,name){
  var i=sortedNames.indexOf(name);if(i<0)return 3;
  if(i<5)return 1;if(i<10)return 2;return 3;
}
function lineW(pts,max){
  // log-ish thickness: readable from ~0 to 50000+
  var t=Math.log10((pts||0)+10)/Math.log10((max||0)+10);
  return 1.2+Math.max(0,Math.min(1,t))*2.4;
}
function drawMap(svg,scores,total){
  var W=360,H=360,cx=180,cy=180;
  var others=members().filter(function(m){return m.name!=='ゆず'});
  var yuzu=members().find(function(m){return m.name==='ゆず'});
  var unlocked=!(total<1000);
  var ranked=others.slice().sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)});
  var rankedNames=ranked.map(function(m){return m.name});
  var max=Math.max.apply(null,others.map(function(m){return scores[m.name]||0}).concat([1]));
  var rings={1:[],2:[],3:[]};
  ranked.forEach(function(m){
    var locked=m.name==='星野王子'&&!unlocked;
    rings[locked?3:ringByRank(rankedNames,m.name)].push(m);
  });
  // keep rank order inside each ring
  [1,2,3].forEach(function(ri){rings[ri].sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)})});
  var h='<defs><radialGradient id="cg" cx="50%" cy="50%"><stop offset="0%" stop-color="#ffe08a"/><stop offset="100%" stop-color="#ffb3c8"/></radialGradient>'+
    '<filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<clipPath id="pairClip"><circle cx="'+cx+'" cy="'+cy+'" r="38"/></clipPath></defs>';
  h+='<circle cx="'+cx+'" cy="'+cy+'" r="168" fill="#fff6f9" stroke="#ffd0e0"/><circle cx="'+cx+'" cy="'+cy+'" r="118" fill="none" stroke="#ffe4ee"/><circle cx="'+cx+'" cy="'+cy+'" r="72" fill="none" stroke="#ffe4ee"/>';
  // Center: Eiji + ゆず pair (twoshot), glamorous gold
  var yp=scores['ゆず']||0;
  h+='<g class="clPair" data-jump="'+(yuzu?esc(yuzu.id):'')+'" style="cursor:pointer" filter="url(#glow)">'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="42" fill="#fff" stroke="#ffd700" stroke-width="4"/>'+
    '<image href="img/twoshot.svg" x="'+(cx-38)+'" y="'+(cy-38)+'" width="76" height="76" clip-path="url(#pairClip)"/>'+
    '<g class="clSpark"><circle cx="'+(cx-28)+'" cy="'+(cy-30)+'" r="2.2" fill="#ffd700"/><circle cx="'+(cx+30)+'" cy="'+(cy-26)+'" r="1.8" fill="#ff8fb3"/><circle cx="'+(cx+28)+'" cy="'+(cy+28)+'" r="2" fill="#ffd700"/><circle cx="'+(cx-30)+'" cy="'+(cy+24)+'" r="1.5" fill="#ff8fb3"/></g>'+
    '</g>';
  h+='<text x="'+cx+'" y="'+(cy+52)+'" text-anchor="middle" font-size="10" font-weight="800" fill="#b8860b">👑 エイジの嫁</text>';
  h+='<text x="'+cx+'" y="'+(cy+64)+'" text-anchor="middle" font-size="9" fill="#a0466a">ゆず '+yp.toLocaleString()+'pt</text>';
  // 15 others around the pair (icons 1.5x: r=27 min; collision nudge)
  var placed=[];
  function nudge(x,y,rr){
    for(var k=0;k<80;k++){
      var hit=false;
      for(var j=0;j<placed.length;j++){
        var p=placed[j],dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy),need=rr+p.r+3;
        if(d<need&&d>0){var push=(need-d)/d;x+=dx*push*0.7;y+=dy*push*0.7;hit=true}
        else if(d===0){x+=need*0.4;y+=need*0.2;hit=true}
      }
      // keep near canvas
      var lim=170;var dx0=x-cx,dy0=y-cy,rad=Math.hypot(dx0,dy0);
      if(rad>lim){x=cx+dx0/rad*lim;y=cy+dy0/rad*lim}
      if(rad<55){x=cx+dx0/Math.max(rad,1)*55;y=cy+dy0/Math.max(rad,1)*55}
      if(!hit)break;
    }
    placed.push({x:x,y:y,r:rr});return {x:x,y:y};
  }
  [1,2,3].forEach(function(ri){
    var arr=rings[ri],rad=ri===1?92:ri===2?132:172;
    arr.forEach(function(m,i){
      var ang=-Math.PI/2+(i+0.5)/Math.max(arr.length,1)*Math.PI*2;
      var x0=cx+Math.cos(ang)*rad,y0=cy+Math.sin(ang)*rad,p=scores[m.name]||0;
      var locked=m.name==='星野王子'&&!unlocked;
      var rr=27; // 1.5x of 18 — fixed minimum, no shrink with points
      var pos=nudge(x0,y0,rr),x=pos.x,y=pos.y;
      var thick=locked?1.2:lineW(p,max);
      h+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x+'" y2="'+y+'" stroke="'+(locked?'#ddd':'#ffb3c8')+'" stroke-width="'+thick.toFixed(2)+'" opacity=".85"/>';
      h+='<g class="clNode" data-jump="'+esc(m.id)+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="'+rr+'" fill="#fff" stroke="'+(locked?'#bbb':'#ff8fb3')+'" stroke-width="2.2"/>';
      if(locked)h+='<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="11" fill="#888">？？？</text>';
      else if(m.av)h+='<image href="img/avatars/'+esc(m.av)+'.png?v=1" x="'+(x-22)+'" y="'+(y-22)+'" width="44" height="44" clip-path="circle(22px at 22px 22px)"/>';
      else h+='<text x="'+x+'" y="'+(y+7)+'" text-anchor="middle" font-size="22">'+esc(m.ic)+'</text>';
      if(!locked)h+='<text x="'+x+'" y="'+(y+rr+12)+'" text-anchor="middle" font-size="9" fill="#a0466a">'+(p>=1000?(p/1000).toFixed(p>=10000?0:1)+'k':p)+'</text>';
      h+='</g>';
    });
  });
  svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.innerHTML=h;
  svg.querySelectorAll('[data-jump]').forEach(function(g){g.addEventListener('click',function(){
    var id=g.getAttribute('data-jump');if(!id)return;var el=document.getElementById(id);if(!el)return;
    var f=el.querySelector('.fold');if(f)f.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});
  })});
}
function render(){
  var sec=document.getElementById('clSec');if(!sec)return;
  var scores={},total=0;members().forEach(function(m){scores[m.name]=scoreOne(m.name);total+=scores[m.name]});
  checkLv(scores);
  sec.querySelector('.clTot').textContent='みんな合計 '+total.toLocaleString()+'pt';
  drawList(sec.querySelector('.clBox'),scores,total);
  drawMap(sec.querySelector('.clMap'),scores,total);
  window.__OM_CLOSE={scores:scores,total:total,lv:g('om_lv',{}),peak:g('om_pts_peak',{})};
}
function boot(){
  // attach av/ic data from DOM
  document.querySelectorAll('.mem[id^="m-"]').forEach(function(el){
    var img=el.querySelector('.avw img');var ic=el.querySelector('.avw .ic');
    if(img){var m=img.src.match(/avatars\/([^.\/]+)\./);if(m)el.dataset.av=m[1]}
    if(ic)el.dataset.ic=ic.textContent;
  });
  var host=document.getElementById('nstrip');if(!host||document.getElementById('clSec'))return;
  var sec=document.createElement('details');sec.id='clSec';sec.className='clSec';
  if(g('om_close_open',false))sec.open=true;
  sec.innerHTML='<summary>💞 親密度と関係図 <span class="clTot"></span></summary><div class="clWrap"><svg class="clMap" width="100%" role="img" aria-label="関係図"></svg><div class="clBox"></div></div>';
  host.insertAdjacentElement('afterend',sec);
  sec.addEventListener('toggle',function(){try{localStorage.setItem('om_close_open',JSON.stringify(!!sec.open))}catch(e){}});
  // load posts then render
  fetch('data/posts.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():{}}).then(function(j){window.__OM_POSTS=j.posts||j||{};render()}).catch(function(){window.__OM_POSTS={};render()});
  // re-render after reactions/replies change
  var _set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_set.apply(this,arguments);if(/om_react|om_reply|om_pts_peak/.test(k))setTimeout(render,80)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.omCloseness={render:render,scoreOne:scoreOne,lvOf:lvOf};
})();
