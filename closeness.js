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
    var av=m.av?'<img src="img/avatars/'+esc(m.av)+'.png?v=1" alt="">':'<span class="clIc">'+esc(m.ic)+'</span>';
    var fl=flavors(m.name,p);
    var tag=m.name==='ゆず'?' <span class="clWife">👑 エイジの嫁</span>':'';
    h+='<a class="clRow'+(m.name==='ゆず'?' yuzu':'')+'" href="#'+esc(m.id)+'">'+
      '<span class="clAv">'+av+'</span><span class="clMeta"><b>'+esc(m.name)+tag+'</b>'+
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
  var h='<defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<clipPath id="pairClip"><circle cx="'+cx+'" cy="'+cy+'" r="38"/></clipPath></defs>';
  h+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r3+'" fill="#fff6f9" stroke="#ffd0e0"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#ffe4ee"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r1+'" fill="none" stroke="#ffe4ee"/>';
  var yp=scores['ゆず']||0;
  h+='<g class="clPair" data-jump="'+(yuzu?esc(yuzu.id):'')+'" style="cursor:pointer" filter="url(#glow)">'+
    '<circle cx="'+cx+'" cy="'+cy+'" r="42" fill="#fff" stroke="#ffd700" stroke-width="4"/>'+
    '<image href="'+coupleSrc.replace(/"/g,'')+'" x="'+(cx-38)+'" y="'+(cy-38)+'" width="76" height="76" clip-path="url(#pairClip)" preserveAspectRatio="xMidYMid slice"/>'+
    '<g class="clSpark"><circle cx="'+(cx-28)+'" cy="'+(cy-30)+'" r="2.2" fill="#ffd700"/><circle cx="'+(cx+30)+'" cy="'+(cy-26)+'" r="1.8" fill="#ff8fb3"/><circle cx="'+(cx+28)+'" cy="'+(cy+28)+'" r="2" fill="#ffd700"/><circle cx="'+(cx-30)+'" cy="'+(cy+24)+'" r="1.5" fill="#ff8fb3"/></g>'+
    '</g>';
  h+='<text x="'+cx+'" y="'+(cy+54)+'" text-anchor="middle" font-size="10" font-weight="800" fill="#b8860b">👑 エイジの嫁</text>';
  h+='<text x="'+cx+'" y="'+(cy+66)+'" text-anchor="middle" font-size="9" fill="#a0466a">ゆず '+yp.toLocaleString()+'pt</text>';
  placed.forEach(function(p){
    var m=p.m,x=p.x,y=p.y,pts=scores[m.name]||0;
    var thick=lineW(pts,max);
    h+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x+'" y2="'+y+'" stroke="#ffb3c8" stroke-width="'+thick.toFixed(2)+'" opacity=".85"/>';
    h+='<g class="clNode" data-jump="'+esc(m.id)+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="'+RR+'" fill="#fff" stroke="#ff8fb3" stroke-width="2.2"/>';
    if(m.av)h+='<image href="img/avatars/'+esc(m.av)+'.png?v=1" x="'+(x-22)+'" y="'+(y-22)+'" width="44" height="44" clip-path="circle(22px at 22px 22px)"/>';
    else h+='<text x="'+x+'" y="'+(y+7)+'" text-anchor="middle" font-size="22">'+esc(m.ic)+'</text>';
    h+='<text x="'+x+'" y="'+(y+RR+12)+'" text-anchor="middle" font-size="9" fill="#a0466a">'+(pts>=1000?(pts/1000).toFixed(pts>=10000?0:1)+'k':pts)+'</text>';
    h+='</g>';
  });
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
function render(){
  var sec=document.getElementById('clSec');if(!sec)return;
  var scores={},total=0;members().forEach(function(m){scores[m.name]=scoreOne(m.name);total+=scores[m.name]});
  checkLv(scores);
  var top=sec.querySelector('.clTop');
  var rank=members().filter(function(m){return m.name!=='ゆず'}).sort(function(a,b){return (scores[b.name]||0)-(scores[a.name]||0)}).slice(0,5);
  if(top){
    var th='<div class="clTopH">💞 エイジとの親密度 TOP5</div><ol class="clTopL">';
    rank.forEach(function(m,i){
      var av=m.av?'<img src="img/avatars/'+esc(m.av)+'.png?v=1" alt="">':'<span>'+esc(m.ic||'💬')+'</span>';
      th+='<li><i>'+(i+1)+'</i><span class="clTopAv">'+av+'</span><b>'+esc(m.name)+'</b><em>'+(scores[m.name]||0).toLocaleString()+'pt</em></li>';
    });
    top.innerHTML=th+'</ol>';
  }
  // TOP5 medals on main .mem avatars (ゆず never)
  var rankOf={};rank.forEach(function(m,i){rankOf[m.name]=i});
  members().forEach(function(m){
    var wrap=m.el.querySelector('.avw');if(!wrap)return;
    var badge=wrap.querySelector('.clMed');
    if(m.name==='ゆず'||rankOf[m.name]==null){if(badge)badge.remove();return}
    if(!badge){badge=document.createElement('span');badge.className='clMed';wrap.appendChild(badge)}
    var r=rankOf[m.name]+1;
    badge.setAttribute('data-r',String(r));
    badge.title='親密度 '+r+'位';
    if(r<=3)badge.textContent=['🥇','🥈','🥉'][r-1];
    else{badge.textContent='';badge.innerHTML='<span class="clMedE">🏅</span><span class="clMedN">'+r+'</span>'}
  });
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
  sec.innerHTML='<summary>💞 親密度と関係図</summary><div class="clWrap"><div class="clTop"></div><svg class="clMap" width="100%" role="img" aria-label="関係図"></svg><div class="clBox"></div></div>';
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
