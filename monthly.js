/* 🏆 月間ランキング (om_monthly v1) — 点数ルールは closeness scoreOne と同じ式・月で区切る。ゆず除外。 */
(function(){
var START='2026-11-01';
var KM='om_marks', KE='om_equip'; // local equip preview (never deletes server inventory)
var RP='❤️',TH='🙏',CL='👏',PV={};PV[RP]=3;PV[TH]=1;PV[CL]=2;
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML}
function jstNow(){return new Date(Date.now()+9*3600e3)}
function ymd(d){return d.toISOString().slice(0,10)}
function ym(d){return d.toISOString().slice(0,7)}
function monthBounds(ymStr){
  var y=+ymStr.slice(0,4),m=+ymStr.slice(5,7);
  var start=ymStr+'-01';
  var endD=new Date(Date.UTC(y,m,0)); // last day of month
  var end=y+'-'+('0'+m).slice(-2)+'-'+('0'+endD.getUTCDate()).slice(-2);
  return {start:start,end:end,ym:ymStr};
}
function inMonth(dateStr,b){return dateStr>=b.start&&dateStr<=b.end}
function keyDate(k){var i=k.lastIndexOf('_');return i>=0?k.slice(i+1):''}
function membersExYuzu(){
  return [].map.call(document.querySelectorAll('.mem[id^="m-"]'),function(el){
    return {name:el.id.slice(2),el:el};
  }).filter(function(m){return m.name!=='ゆず'});
}
function ptsOfEmoji(e){return PV[e]!=null?PV[e]:2}
/* 既存ルールを月でフィルタ：投稿+10 / ❤️+3 🙏+1 👏+2 他+2 / 返事+15。ピーク・減衰なし（その月の合計のみ） */
function scoreMonth(name,b){
  var R=g('om_react',{}),P=g('om_reply',{});
  var postsN=0;
  document.querySelectorAll('.post[data-who="'+name+'"]').forEach(function(p){
    var id=p.dataset.id||'',d=keyDate(id);
    if(inMonth(d,b))postsN++;
  });
  var rSum=0,rN=0,react={};
  Object.keys(R).forEach(function(k){
    if(k.indexOf(name+'_')!==0)return;
    if(!inMonth(keyDate(k),b))return;
    var e=R[k],v=ptsOfEmoji(e);react[e]=(react[e]||0)+1;rSum+=v;rN++;
  });
  var replyN=0;
  Object.keys(P).forEach(function(k){
    if(k.indexOf(name+'_')!==0)return;
    if(!inMonth(keyDate(k),b))return;
    replyN++;
  });
  var cur=postsN*10+rSum+replyN*15;
  return {postsN:postsN,postsPts:postsN*10,react:react,reactN:rN,reactPts:rSum,replyN:replyN,replyPts:replyN*15,pts:cur};
}
/* competition ranking: 1,2,2,4 */
function rankList(rows){
  var sorted=rows.slice().sort(function(a,b){return b.pts-a.pts||a.name.localeCompare(b.name,'ja')});
  var out=[],i=0;
  while(i<sorted.length){
    var j=i;while(j<sorted.length&&sorted[j].pts===sorted[i].pts)j++;
    var rank=i+1;
    for(var k=i;k<j;k++){
      var tier=rank<=3?1:rank<=7?2:0;
      out.push(Object.assign({},sorted[k],{rank:rank,tier:tier}));
    }
    i=j;
  }
  return out;
}
function daysUntil(ymdTarget){
  var a=jstNow();a=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate()));
  var t=ymdTarget.split('-');var b=new Date(Date.UTC(+t[0],+t[1]-1,+t[2]));
  return Math.round((b-a)/864e5);
}
var INV=null,REW={},SNAP={};
function fetchJSON(u){return fetch(u+'?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
function loadData(){
  return Promise.all([
    fetchJSON('data/inventory.json'),
    fetchJSON('data/rewards/2026-11.json'),
    fetchJSON('data/monthly/2026-11.json')
  ]).then(function(arr){
    INV=arr[0]||{members:{}};
    if(arr[1])REW['2026-11']=arr[1];
    if(arr[2])SNAP['2026-11']=arr[2];
  });
}
function ownedOf(name){
  var m=(INV.members||{})[name]||{};
  return {owned:m.owned||[],equip:Object.assign({},m.equip||{},g(KE,{})[name]||{})};
}
function applyCosmetics(){
  membersExYuzu().concat([{name:'ゆず',el:document.getElementById('m-ゆず')}]).forEach(function(m){
    if(!m.el)return;
    var o=ownedOf(m.name),eq=o.equip||{};
    m.el.classList.remove('rw-frame','rw-bg','rw-icon','rw-fx','rw-sticker');
    m.el.classList.toggle('rw-frame',eq.frame==='momiji-frame');
    m.el.classList.toggle('rw-bg',eq.bg==='momiji-bg');
    m.el.classList.toggle('rw-icon',eq.icon==='momiji-icon');
    m.el.classList.toggle('rw-fx',eq.fx==='momiji-fx');
    m.el.classList.toggle('rw-sticker',eq.sticker==='momiji-sticker');
    // unlock seasonal mark into om_marks if owned and equipped
    if(eq.mark==='momiji-mark'||(o.owned||[]).indexOf('momiji-mark')>=0){
      try{
        var marks=g(KM,null);if(!Array.isArray(marks))marks=['❤️','🙏','👏'];
        if(marks.indexOf('🍁')<0){marks.push('🍁');localStorage.setItem(KM,JSON.stringify(marks.slice(0,8)))}
      }catch(e){}
    }
  });
}
function saveEquip(name,equip){
  var all=g(KE,{});all[name]=equip;localStorage.setItem(KE,JSON.stringify(all));
  applyCosmetics();
}
function openBag(name){
  var o=ownedOf(name),items=o.owned||[],eq=Object.assign({},o.equip);
  var catalog={};
  Object.keys(REW).forEach(function(ym){(REW[ym].tiers['1'].items.concat(REW[ym].tiers['2'].items)).forEach(function(it){catalog[it.id]=it})});
  // also known stickers
  if(!items.length){
    var html0='<div class="mnOv" id="mnBag"><div class="mnBox"><div class="mnH">🎒 '+esc(name)+' のアイテム</div><p class="mnSub">まだアイテムはないよ。月間ランキングでもらえるよ🍁</p><button type="button" class="mnX">とじる</button></div></div>';
    var old=document.getElementById('mnBag');if(old)old.remove();
    document.body.insertAdjacentHTML('beforeend',html0);
    document.getElementById('mnBag').onclick=function(ev){if(ev.target.id==='mnBag'||ev.target.classList.contains('mnX'))this.remove()};
    return;
  }
  var slots=['frame','bg','icon','mark','fx','sticker'];
  var html='<div class="mnOv" id="mnBag"><div class="mnBox"><div class="mnH">🎒 '+esc(name)+' のアイテム</div><p class="mnSub">装備はここでプレビューできるよ。本番反映はゆずに「これつけて」と伝えてね</p><div class="mnInv">';
  items.forEach(function(id){
    var it=catalog[id]||{id:id,name:id,slot:'frame',desc:''};
    var on=eq[it.slot]===id;
    html+='<button type="button" class="mnItem'+(on?' on':'')+'" data-id="'+esc(id)+'" data-slot="'+esc(it.slot)+'">'
      +'<b>'+esc(it.name)+'</b><small>'+esc(it.desc||it.slot)+'</small>'+(on?' ✅装備中':'')+'</button>';
  });
  html+='</div><button type="button" class="mnX">とじる</button></div></div>';
  var old=document.getElementById('mnBag');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',html);
  var ov=document.getElementById('mnBag');
  ov.querySelectorAll('.mnItem').forEach(function(b){
    b.onclick=function(){
      var id=b.dataset.id,slot=b.dataset.slot;
      if(eq[slot]===id)delete eq[slot];else eq[slot]=id;
      saveEquip(name,eq);ov.remove();openBag(name);
    };
  });
  ov.onclick=function(ev){if(ev.target===ov||ev.target.classList.contains('mnX'))ov.remove()};
}
function rulesHTML(){
  return '<details class="mnRules"><summary>🏆 月間ランキングのルール</summary>'
    +'<div class="mnRulesB">'
    +'<p><b>スタート：</b>2026年11月1日（Asia/Tokyo）から毎月開催</p>'
    +'<p><b>対象：</b>ゆず以外の全員（いまのノートにいるメンバー全員）。人数はメンバーが増減したら自動で変わるよ</p>'
    +'<p><b>集計：</b>その月の1日〜月末までの親密度ポイント合計だけ（通常の点数ルールと同じ）</p>'
    +'<ul>'
    +'<li>投稿1件 → +10pt</li>'
    +'<li>リアクション：❤️+3　🙏+1　👏+2　その他の絵文字+2</li>'
    +'<li>返事1件 → +15pt</li>'
    +'<li>しきい値なし・減衰なし。その月の合計のみ（過去月のピークは使わない）</li>'
    +'</ul>'
    +'<p><b>順位：</b>同じ点数は同じ順位（競争順位）。例：1位・2位タイ・2位タイ・4位</p>'
    +'<p><b>報酬：</b>1〜3位＝上位セット、4〜7位＝がんばりセット。同点でその順位に入った人はみんな同じセット。毎月テーマが変わるよ</p>'
    +'<p><b>アイテム：</b>一度もらったアイテムはずっと🎒に残る。装備はゆずに希望を伝えてね（エイジはプレビュー装備もできるよ）</p>'
    +'<p><b>11月テーマ：</b>紅葉🍁　落ち葉フレーム・紅葉背景・花びら枠・🍁マーク・ひらひら落ち葉 など</p>'
    +'</div></details>';
}
function rewardsPreviewHTML(cfg){
  if(!cfg)return '';
  var t1=cfg.tiers['1'],t2=cfg.tiers['2'];
  function lis(items){return '<ul>'+items.map(function(it){return '<li><b>'+esc(it.name)+'</b> — '+esc(it.desc)+'</li>'}).join('')+'</ul>'}
  return '<div class="mnRew"><div class="mnRewH">'+esc(cfg.themeEmoji||'🍁')+' '+esc(cfg.title)+' の報酬</div>'
    +'<div class="mnRewT"><b>'+esc(t1.label)+'</b>'+lis(t1.items)+'</div>'
    +'<div class="mnRewT"><b>'+esc(t2.label)+'</b>'+lis(t2.items)+'</div></div>';
}
function tableHTML(ranked,live){
  if(!ranked.length)return '<p class="mnSub">まだ点数がないよ</p>';
  var h='<ol class="mnList">';
  ranked.forEach(function(r){
    var badge=r.tier===1?'🥇上位':r.tier===2?'🥈がんばり':'';
    h+='<li data-tier="'+r.tier+'"><i>'+r.rank+'</i><b>'+esc(r.name)+'</b><em>'+r.pts.toLocaleString()+'pt</em>'
      +(badge?'<span class="mnTier">'+badge+'</span>':'')+'</li>';
  });
  return h+'</ol>'+(live?'<p class="mnSub">※いまの端末のリアクション・返事＋公開投稿から集計中（確定は月末）</p>':'');
}
function render(){
  var host=document.getElementById('mnSec');if(!host)return;
  var now=jstNow(),today=ymd(now),curYM=ym(now);
  var startDays=daysUntil(START);
  var cfg=REW['2026-11'];
  var html='<summary>🏆 月間ランキング</summary><div class="mnWrap">';
  html+=rulesHTML();
  if(today<START){
    html+='<div class="mnHero">🍁 <b>11月スタート！</b><div class="mnCount">あと <b>'+Math.max(0,startDays)+'</b> 日（'+START.replace(/-/g,'/')+' 0:00 JST）</div>'
      +'<p>11月1日から、ゆず以外のみんなで月間ポイントを競うよ。報酬は紅葉テーマ🍁</p></div>';
    html+=rewardsPreviewHTML(cfg);
  }else{
    var b=monthBounds(curYM);
    var rows=membersExYuzu().map(function(m){return Object.assign({name:m.name},scoreMonth(m.name,b))});
    var ranked=rankList(rows);
    var snap=SNAP[curYM];
    html+='<div class="mnHero"><b>'+b.ym.replace('-','年')+'月</b> の月間ランキング'
      +(snap&&snap.finalized?'（確定）':'（集計中）')+'</div>';
    if(snap&&snap.finalized&&snap.ranking)html+=tableHTML(snap.ranking,false);
    else html+=tableHTML(ranked,true);
    html+=rewardsPreviewHTML(cfg||REW['2026-11']);
  }
  html+='<div class="mnBagBar"><b>🎒 アイテム</b> ';
  membersExYuzu().forEach(function(m){
    var n=(ownedOf(m.name).owned||[]).length;
    html+='<button type="button" class="mnBagB" data-who="'+esc(m.name)+'">'+esc(m.name)+(n?' ·'+n:'')+'</button>';
  });
  html+='</div></div>';
  host.innerHTML=html;
  host.querySelectorAll('.mnBagB').forEach(function(b){b.onclick=function(){openBag(b.dataset.who)}});
  /* per-member 🎒 shortcut */
  membersExYuzu().forEach(function(m){
    if(!m.el||m.el.querySelector('.mnBagMini'))return;
    var nm=m.el.querySelector('.nm');if(!nm)return;
    var b=document.createElement('button');b.type='button';b.className='mnBagMini';b.textContent='🎒';b.title='アイテム';
    b.onclick=function(ev){ev.stopPropagation();openBag(m.name)};
    nm.appendChild(b);
  });
  applyCosmetics();
}
function boot(){
  if(document.getElementById('mnSec'))return;
  var after=document.getElementById('clSec')||document.getElementById('nstrip');
  if(!after){setTimeout(boot,200);return}
  var sec=document.createElement('details');sec.id='mnSec';sec.className='mnSec';sec.open=true;
  /* prefer just under closeness section */
  var cl=document.getElementById('clSec');
  if(cl)cl.insertAdjacentElement('afterend',sec);else after.insertAdjacentElement('afterend',sec);
  loadData().then(render);
  window.addEventListener('storage',function(ev){if(/om_react|om_reply|om_equip/.test(ev.key||''))render()});
  var _set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_set.apply(this,arguments);if(/om_react|om_reply|om_equip/.test(k))setTimeout(render,100)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)});else setTimeout(boot,0);
})();
