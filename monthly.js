/* 🏆 月間ランキング (om_monthly v38 · あみだ同点・報酬枠 floor((n-1)/2) · 11月🎄/12月🎍/2月TBD・紅葉は2027-11温存)
 * 11/1〜アクションマーク点数は window.__OM_ACTION_PTS（closeness.js と共通・仮） */
(function(){
var START='2026-11-01';
var KM='om_marks', KE='om_equip'; // local equip preview (never deletes server inventory)
/* ★仮の点数。closeness が先に読めば同じ定数を共有。調整はこの1か所（または closeness の ACTION_MARK_PTS） */
var ACTION_MARK_PTS=window.__OM_ACTION_PTS||{1:2,2:5,3:10};
var ACTION_MARK_FROM=window.__OM_ACTION_FROM||START;
var RP='❤️',TH='🙏',CL='👏',PV={};PV[RP]=3;PV[TH]=1;PV[CL]=2; // 旧式（月間は11月スタートなので基本使わない）
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
function splitReaction(s){
  if(!s)return [];
  if(typeof s!=='string')s=String(s);
  var known={};Object.keys(PV).forEach(function(e){known[e]=1});
  try{var marks=JSON.parse(localStorage.getItem(KM)||'null');if(Array.isArray(marks))marks.forEach(function(e){if(e)known[e]=1})}catch(e){}
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
function ptsOfReaction(s, dateStr){
  if(s==null||s==='')return 0;
  /* 月間は11/1スタート。念のため日付で切替（旧式は10月以前向け） */
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
  if(partsOld.length<=1)return 2;
  var mx=0;partsOld.forEach(function(p){var v=PV[p]!=null?PV[p]:2;if(v>mx)mx=v});
  return mx;
}
function ptsOfEmoji(e){return ptsOfReaction(e, ACTION_MARK_FROM)}
/* 月間：投稿+10 / アクションマーク個数加点 / 返事+15。コンボは1件。ピーク・減衰なし */
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
    var d=keyDate(k);
    if(!inMonth(d,b))return;
    var e=R[k],v=ptsOfReaction(e, d);react[e]=(react[e]||0)+1;rSum+=v;rN++;
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
/* 同点はあみだくじ（決定的ハッシュ）。1〜3位は同着なし。順位は連番。 */
function fnv1a(s){
  var h=2166136261>>>0;
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return h>>>0;
}
/* seed = 月(YYYY-MM) + 名前。エイジ操作不可・再読込でも同じ結果 */
function luckKey(ym,name){return fnv1a(String(ym)+'\u0000'+String(name))}
function rankList(rows,ym){
  ym=ym||'0000-00';
  var sorted=rows.slice().sort(function(a,b){
    if(b.pts!==a.pts)return b.pts-a.pts;
    var la=luckKey(ym,a.name),lb=luckKey(ym,b.name);
    if(la!==lb)return la<lb?-1:1;
    return a.name.localeCompare(b.name,'ja');
  });
  var out=[],i=0;
  while(i<sorted.length){
    var j=i;while(j<sorted.length&&sorted[j].pts===sorted[i].pts)j++;
    var tied=j-i>1;
    var slots=Math.max(3,Math.floor((sorted.length-1)/2)); /* 半分の少なめ */
    for(var k=i;k<j;k++){
      var rank=k+1; /* 連番：同点でも1,2,3… */
      var tier=rank<=3?1:rank<=slots?2:0;
      out.push(Object.assign({},sorted[k],{rank:rank,tier:tier,luck:tied,luckKey:luckKey(ym,sorted[k].name),rewardSlots:slots}));
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
  var months=['2026-11','2026-12','2027-02','2027-11'];
  var jobs=[fetchJSON('data/inventory.json')];
  months.forEach(function(ym){jobs.push(fetchJSON('data/rewards/'+ym+'.json'));jobs.push(fetchJSON('data/monthly/'+ym+'.json'))});
  return Promise.all(jobs).then(function(arr){
    INV=arr[0]||{members:{}};
    months.forEach(function(ym,i){
      if(arr[1+i*2])REW[ym]=arr[1+i*2];
      if(arr[2+i*2])SNAP[ym]=arr[2+i*2];
    });
  });
}
function ownedOf(name){
  var m=(INV.members||{})[name]||{};
  return {owned:m.owned||[],equip:Object.assign({},m.equip||{},g(KE,{})[name]||{})};
}
function applyCosmetics(){
  var MARK_EMOJI={'momiji-mark':'🍁','xmas-mark':'🎄','shogatsu-mark':'🎍'};
  membersExYuzu().concat([{name:'ゆず',el:document.getElementById('m-ゆず')}]).forEach(function(m){
    if(!m.el)return;
    var o=ownedOf(m.name),eq=o.equip||{};
    m.el.classList.remove('rw-frame','rw-bg','rw-icon','rw-fx','rw-sticker');
    ['frame','bg','icon','fx','sticker'].forEach(function(slot){
      if(eq[slot]){m.el.classList.add('rw-'+slot);m.el.setAttribute('data-rw-'+slot,eq[slot])}
      else{m.el.removeAttribute('data-rw-'+slot)}
    });
    // unlock seasonal marks into om_marks if owned
    Object.keys(MARK_EMOJI).forEach(function(id){
      if(eq.mark===id||(o.owned||[]).indexOf(id)>=0){
        try{
          var em=MARK_EMOJI[id],marks=g(KM,null);if(!Array.isArray(marks))marks=['❤️','🙏','👏'];
          if(marks.indexOf(em)<0){marks.push(em);localStorage.setItem(KM,JSON.stringify(marks.slice(0,8)))}
        }catch(e){}
      }
    });
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
    var html0='<div class="mnOv" id="mnBag"><div class="mnBox"><div class="mnH">🎒 '+esc(name)+' のアイテム</div><p class="mnSub">まだアイテムはないよ。月間ランキングでもらえるよ🎄</p><button type="button" class="mnX">とじる</button></div></div>';
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

var MN_TOP_COMMENTS={comments:{}};
function loadMnTopComments(){
  return fetch('data/top_comments.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(j&&j.comments)MN_TOP_COMMENTS=j; return MN_TOP_COMMENTS;
  }).catch(function(){return MN_TOP_COMMENTS});
}
function topCmtFor(who){
  var arr=(MN_TOP_COMMENTS.comments||{})[who]||[];
  if(!arr.length)return '';
  var h='<div class="mnHot"><div class="mnHotH">🔥 エイジからのアツいコメント</div>';
  arr.forEach(function(it){
    if(!it||!it.text)return;
    var d=it.date?String(it.date).replace(/^\d{4}-/,'').replace('-','/'):'';
    h+='<div class="mnHotB">「'+esc(it.text)+'」'+(d?' <small>'+esc(d)+'</small>':'')+'</div>';
  });
  return h+'</div>';
}

function rulesHTML(){
  var p1=ACTION_MARK_PTS[1],p2=ACTION_MARK_PTS[2],p3=ACTION_MARK_PTS[3];
  return '<details class="mnRules" open><summary>🏆 月間ランキングのルール</summary>'
    +'<div class="mnRulesB">'
    +'<p><b>スタート：</b>2026年11月1日（Asia/Tokyo）から毎月開催</p>'
    +'<p><b>対象：</b>ゆず以外の全員（いまのノートにいるメンバー全員）。人数はメンバーが増減したら自動で変わるよ。ゆずはランキング対象外（レベルだけ上がるよ）</p>'
    +'<p><b>集計：</b>その月の1日〜月末までのポイント合計</p>'
    +'<ul>'
    +'<li>投稿1件 → +10pt</li>'
    +'<li><b>アクションマーク（エイジが投稿につけるマーク）</b>：1つ → <b>+'+p1+'pt</b>　／　2つコンボ → <b>+'+p2+'pt</b>　／　3つトリプル（👏お礼入り） → <b>+'+p3+'pt</b></li>'
    +'<li>※この点数は仮だよ。運用してみて調整するかも♡</li>'
    +'<li>組み合わせは1件のリアクションとして数えるよ</li>'
    +'<li>返事1件 → +15pt</li>'
    +'<li>しきい値なし・減衰なし。その月の合計のみ（過去月のピークは使わない）</li>'
    +'</ul>'
    +'<p><b>順位：</b>点数が多い順。同点のときは🎲あみだくじ（その月の名前から決まる運）で順番を決めるよ。エイジが選ぶことはない。1〜3位は同着なし。例：5人が同点ならあみだで1〜5位を決めて、次の人は6位</p>'
    +'<p><b>報酬：</b>1〜3位＝上位セット（🥇🥈🥉）、4位〜（参加人数の半分の少なめ＝floor((人数-1)/2)位）＝がんばりセット（🎀）。人数が増えても報酬枠は半分より少なめ。毎月テーマが変わるよ</p>'
    +'<p><b>アイテム：</b>一度もらったアイテムはずっと🎒に残る。装備はゆずに希望を伝えてね（エイジはプレビュー装備もできるよ）</p>'
    +'<p><b>テーマ：</b>11月🎄クリスマス　／　12月🎍お正月グッズ　／　2月は近くなったら決めるよ　（紅葉🍁は来年2027年11月に温存）</p>'
    +'<p><b>🔥 ボーナス：</b>トップ3に入るとエイジからアツいコメントがもらえるよ！</p>'
    +'</div></details>';
}
function rewardsPreviewHTML(cfg){
  if(!cfg)return '';
  if(cfg.status==='tbd'||!cfg.tiers||!(cfg.tiers['1']&&cfg.tiers['1'].items&&cfg.tiers['1'].items.length)){
    return '<div class="mnRew"><div class="mnRewH">'+esc(cfg.themeEmoji||'💭')+' '+esc(cfg.title||'未定')+'</div>'
      +'<p class="mnSub">'+esc(cfg.note||'近くなったら決めるよ')+'</p></div>';
  }
  var t1=cfg.tiers['1'],t2=cfg.tiers['2'];
  function lis(items){return '<ul>'+(items||[]).map(function(it){return '<li><b>'+esc(it.name)+'</b> — '+esc(it.desc)+'</li>'}).join('')+'</ul>'}
  return '<div class="mnRew"><div class="mnRewH">'+esc(cfg.themeEmoji||'🎁')+' '+esc(cfg.title)+' の報酬</div>'
    +'<div class="mnRewT"><b>'+esc(t1.label)+'</b>'+lis(t1.items)+'</div>'
    +'<div class="mnRewT"><b>'+esc(t2.label)+'</b>'+lis(t2.items)+'</div></div>';
}
function tableHTML(ranked,live){
  if(!ranked.length)return '<p class="mnSub">まだ点数がないよ</p>';
  var anyLuck=ranked.some(function(r){return r.luck});
  var h='';
  if(anyLuck)h+='<p class="mnLuckNote"><span class="mnDice" aria-hidden="true">🎲</span>同点→あみだで決定（月＋名前の運・毎回同じ）</p>';
  h+='<ol class="mnList">';
  ranked.forEach(function(r){
    var badge=r.tier===1?(r.rank===1?'🥇上位':r.rank===2?'🥈上位':r.rank===3?'🥉上位':'🥇上位'):r.tier===2?'🎀がんばり':'';
    h+='<li data-tier="'+r.tier+'"'+(r.luck?' data-luck="1"':'')+(r.rank<=3?' class="mnTop3"':'')+'><div class="mnRow"><i>'+r.rank+'</i><b>'+esc(r.name)+'</b><em>'+r.pts.toLocaleString()+'pt</em>'
      +(r.luck?'<span class="mnLuck" title="同点のためあみだくじで順位決定">🎲あみだ</span>':'')
      +(badge?'<span class="mnTier">'+badge+'</span>':'')+'</div>'
      +(r.rank<=3?topCmtFor(r.name):'')+'</li>';
  });
  return h+'</ol>'+(live?'<p class="mnSub">※いまの端末のリアクション・返事＋公開投稿から集計中（確定は月末）</p>':'');
}
function render(){
  var host=document.getElementById('mnSec');if(!host)return;
  var now=jstNow(),today=ymd(now),curYM=ym(now);
  var startDays=daysUntil(START);
  var cfg=REW[curYM]||REW['2026-11'];
  var html='<summary>🏆 月間ランキング</summary><div class="mnWrap">';
  html+=rulesHTML();
  if(today<START){
    var p1=ACTION_MARK_PTS[1],p2=ACTION_MARK_PTS[2],p3=ACTION_MARK_PTS[3];
    html+='<div class="mnHero">🎄 <b>11月スタート！</b><div class="mnCount">あと <b>'+Math.max(0,startDays)+'</b> 日（'+START.replace(/-/g,'/')+' 0:00 JST）</div>'
      +'<p>11月1日から、ゆず以外のみんなで月間ポイントを競うよ。報酬はクリスマステーマ🎄（12月はお正月🎍）</p></div>';
    html+='<div class="mnHero" style="background:#ffe8f0;border:2px solid #ff8fb3">'
      +'<b>📣 お知らせ（みんなへ）</b>'
      +'<p style="margin:6px 0 0">11月1日から、エイジがつける<strong>アクションマークの点数</strong>が新しくなるよ♡</p>'
      +'<ul style="margin:6px 0 0;padding-left:18px">'
      +'<li>マーク <b>1つ</b> → <b>'+p1+'pt</b></li>'
      +'<li>マーク <b>2つ</b>コンボ → <b>'+p2+'pt</b></li>'
      +'<li>マーク <b>3つ</b>トリプル（👏お礼入り） → <b>'+p3+'pt</b></li>'
      +'</ul>'
      +'<p style="margin:6px 0 0;font-size:12.5px">投稿+10・返事+15はそのまま。点数は仮だから、様子を見て調整するかも。ゆずはランキング対象外（レベルだけ上がるよ）💖</p>'
      +'<p style="margin:6px 0 0;font-size:13px;font-weight:800;color:#d0567f">🔥 トップ3に入るとエイジからアツいコメントがもらえるよ！</p>'
      +'</div>';
    /* 同点あみだの見え方デモ（固定データ・本番集計ではない） */
    var demo=rankList([
      {name:'瀬戸',pts:50},{name:'らん',pts:50},{name:'レイ',pts:50},{name:'まい',pts:50},{name:'まちゃ',pts:50},
      {name:'由依',pts:30},{name:'恵',pts:30}
    ],'2026-11');
    html+='<div class="mnDemo"><div class="mnDemoH">🎲 同点のときのあみだ例（お試し表示）</div>'
      +tableHTML(demo,false)
      +'<p class="mnSub">※これは説明用。本番は11月からリアルタイム集計。同点グループだけあみだで1・2・3…と並べるよ</p></div>';
    html+=rewardsPreviewHTML(REW['2026-11']);
    html+=rewardsPreviewHTML(REW['2026-12']);
    html+=rewardsPreviewHTML(REW['2027-02']);
  }else{
    var b=monthBounds(curYM);
    var rows=membersExYuzu().map(function(m){return Object.assign({name:m.name},scoreMonth(m.name,b))});
    var ranked=rankList(rows,b.ym);
    var snap=SNAP[curYM];
    html+='<div class="mnHero"><b>'+b.ym.replace('-','年')+'月</b> の月間ランキング'
      +(snap&&snap.finalized?'（確定）':'（集計中）')+'</div>';
    if(snap&&snap.finalized&&snap.ranking)html+=tableHTML(snap.ranking,false);
    else html+=tableHTML(ranked,true);
    html+=rewardsPreviewHTML(cfg||REW[curYM]||REW['2026-11']);
    if(curYM==='2026-11'&&REW['2026-12'])html+=rewardsPreviewHTML(REW['2026-12']);
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
  Promise.all([loadData(),loadMnTopComments()]).then(function(){render();setTimeout(applyCosmetics,300);});
  window.addEventListener('storage',function(ev){if(/om_react|om_reply|om_equip/.test(ev.key||''))render()});
  var _set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_set.apply(this,arguments);if(/om_react|om_reply|om_equip/.test(k))setTimeout(render,100)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)});else setTimeout(boot,0);
})();
