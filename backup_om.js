/* 思い出ノート: 送る・バックアップ・復元（データは消さない／マージのみ） v43 top_comments */
(function(){
var K={r:'om_react',p:'om_reply',d:'om_read',h:'om_sent_history'};
var PHOTO_BATCH=4;
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function lsSet(k,v){
  try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));return true}
  catch(e){
    if(e&&(e.name==='QuotaExceededError'||e.code===22||/quota/i.test(String(e.message||e)))){
      console.warn('ls quota',k); return false;
    }
    console.warn('ls set fail',k,e); return false;
  }
}
function jst(){return new Date(Date.now()+9*3600e3).toISOString()}
function pendingProfileFields(){try{var all=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{},out={};Object.keys(all).forEach(function(name){if(String(name).indexOf('__')===0)return;var f=all[name];if(!f||typeof f!=='object'||Array.isArray(f))return;var clean={};Object.keys(f).forEach(function(k){if(k.indexOf('__')===0)return;if(f[k]!=null&&String(f[k]).trim()!=='')clean[k]=f[k]});if(Object.keys(clean).length)out[name]=clean});return out}catch(e){return {}}}
function markFieldsSent(pf){try{var all=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{};Object.keys(pf||{}).forEach(function(name){if(!all[name])all[name]={};all[name].__sentAt=Date.now()});lsSet('om_pf_fields',all);window.__OM_PF_FIELDS=all}catch(e){}}
function pendingProfileOrder(){try{var o=JSON.parse(localStorage.getItem('om_pf_seq')||'null');if(Array.isArray(o)&&o.length)return o.filter(function(x){return typeof x==='string'&&x});var f=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{};if(Array.isArray(f.__order)&&f.__order.length)return f.__order.filter(function(x){return typeof x==='string'&&x})}catch(e){}return null}
function markOrderSent(){lsSet('om_pf_seq_sent',String(Date.now()))}

function histLite(full){
  /* NEVER store base64 photos in history — that was the QuotaExceededError */
  var o={app:full.app,v:full.v,sent:full.sent,
    reactions:full.reactions,replies:full.replies,read:full.read,
    ack:full.ack,ackrp:full.ackrp,filt:full.filt,seenrp:full.seenrp,marks:full.marks,
    closeness:full.closeness,profile_fields:full.profile_fields,profile_order:full.profile_order,top_comments:full.top_comments,
    photo_summary:{}};
  var pp=full.profile_photos||{};
  Object.keys(pp).forEach(function(nm){o.photo_summary[nm]=(pp[nm]||[]).map(function(it){return {slot:it.slot,bytes:(it.jpeg||'').length}})});
  if(full.part) o.part=full.part;
  if(full.parts) o.parts=full.parts;
  if(full.batch_id) o.batch_id=full.batch_id;
  return o;
}
function pushHistory(full){
  var h=g(K.h,[]);
  h.push(histLite(full));
  while(h.length>30) h.shift();
  if(!lsSet(K.h,h)){
    /* drop older entries and retry once */
    while(h.length>5) h.shift();
    if(!lsSet(K.h,h)){
      try{localStorage.removeItem(K.h)}catch(e){}
      lsSet(K.h,[histLite(full)]);
    }
  }
}

async function photosReady(){
  if(window.omPfStore){
    try{ return await window.omPfStore.loadAll() }catch(e){ console.warn(e) }
  }
  return g('om_pf_photos',{});
}
function pendingFromAll(all){
  if(window.omPfStore) return window.omPfStore.toProfilePhotos(window.omPfStore.pendingList(all));
  var out={};
  Object.keys(all||{}).forEach(function(name){
    var pend=[];
    (all[name]||[]).forEach(function(s,i){
      if(s&&s.data&&!s.sent){
        pend.push({slot:i,jpeg:String(s.data).replace(/^data:image\/\w+;base64,/,''),mime:'image/jpeg'});
      }
    });
    if(pend.length) out[name]=pend;
  });
  return out;
}
async function markPhotosSent(pp){
  if(window.omPfStore){
    var pairs=[];
    Object.keys(pp||{}).forEach(function(name){(pp[name]||[]).forEach(function(it){pairs.push({name:name,slot:it.slot})})});
    await window.omPfStore.markSentPairs(pairs);
    return;
  }
  try{
    var all=g('om_pf_photos',{});
    Object.keys(pp||{}).forEach(function(name){(pp[name]||[]).forEach(function(it){
      var a=all[name]; if(Array.isArray(a)&&a[it.slot]&&a[it.slot].data){a[it.slot].sent=true;a[it.slot].sentAt=Date.now()}
    })});
    lsSet('om_pf_photos',all); window.__OM_PF_PHOTOS=all;
  }catch(e){}
}

function baseSnap(extra){
  var c=(window.__OM_CLOSE)||{};
  var pf=pendingProfileFields(), po=pendingProfileOrder();
  var tc=(function(){try{return JSON.parse(localStorage.getItem('om_top_comments')||'{}')||{}}catch(e){return {}}})();
  var o={app:'omoide',v:9,sent:jst().slice(0,16),
    reactions:g(K.r,{}),replies:g(K.p,{}),read:g(K.d,{}),
    ack:g('om_ack',{}),ackrp:g('om_ackrp',{}),filt:localStorage.getItem('om_filt')||'all',
    seenrp:g('om_seenrp',{}),
    marks:(function(){try{return JSON.parse(localStorage.getItem('om_marks')||'null')}catch(e){return null}})(),
    profile_fields:pf,
    closeness:{scores:c.scores||{},total:c.total||0,lv:g('om_lv',{}),peak:g('om_pts_peak',{}),open:g('om_close_open',false)},
    top_comments:tc
  };
  if(po) o.profile_order=po;
  if(extra) Object.keys(extra).forEach(function(k){o[k]=extra[k]});
  return o;
}
function snapSync(){
  var all=window.__OM_PF_PHOTOS||g('om_pf_photos',{});
  return baseSnap({profile_photos:pendingFromAll(all)});
}

function openPartSheet(parts, idx, ctx){
  var part=parts[idx];
  var total=parts.length;
  var isFirst=idx===0;
  var full=part.payload;
  var nph=Object.keys(full.profile_photos||{}).reduce(function(s,k){return s+(full.profile_photos[k]||[]).length},0);
  var nr=Object.keys(full.reactions||{}).length, np=Object.keys(full.replies||{}).length;
  var nf=Object.keys(full.profile_fields||{}).length;
  var t=jst(), ymd=t.slice(0,10).replace(/-/g,'');
  var partLabel=(total>1)?('【写真 '+(idx+1)+'/'+total+'】'):'';
  var intro=function(note){
    return 'ゆずへ💌 思い出ノート'+(partLabel?' '+partLabel:'')+'（'+(+t.slice(5,7))+'/'+(+t.slice(8,10))+'）\n'
      +(isFirst?('リアクション '+nr+'・返事 '+np+(nf?'・プロフィール欄更新 '+nf+'人':'')+(full.profile_order?'・並び順更新':'')+(function(){var t=full.top_comments||{},n=Object.keys(t).reduce(function(s,k){return s+(t[k]||[]).length},0);return n?'・アツいコメント '+n+'件':'';})()+'\n'):'')
      +(nph?('プロフィール写真 '+nph+'枚（全体 '+(idx+1)+'/'+total+'）'):'')
      +(note?'\n'+note:'');
  };
  try{ pushHistory(full) }catch(e){ console.warn('hist',e) }
  var levels=[{data:full,note:nph?'（写真あり・分割送信）':''}];
  var subject='ゆずとみんなへ 思い出ノート '+t.slice(0,10)+(total>1?(' '+partLabel):'')+' omoide-backup-'+ymd+(total>1?('-p'+(idx+1)+'of'+total):'');
  var shareName=total>1
    ? ('omoide_part'+(idx+1)+'of'+total+'.json')
    : (nph?'omoide_photos.json':'omoide_backup.json');
  yuzuSend({subject:subject,intro:intro,levels:levels,full:full,
    fullNote:nph?'※プロフィール写真つき。共有（JSONファイル）がおすすめ♡':undefined,
    shareFileName:shareName,
    preferShare:!!(nph||total>1),
    theme:{bg:'#fff',fg:'#2f3a45',acc:'#d0477a',btn:'linear-gradient(90deg,#ff8fb3,#d0567f)',btnfg:'#fff',sub:'#ffe3ee'}});
  var ov=document.getElementById('yzSendOv');
  if(!ov) return;
  if(total>1 || nph){
    var tip=document.createElement('div');
    tip.style.cssText='font-size:13px;line-height:1.45;margin:8px 0;padding:8px 10px;border-radius:12px;background:#fff6e8;color:#8a5a10;font-weight:700';
    tip.textContent=total>1
      ?('📷 写真が多いから '+total+'通に分けて送るよ。今は '+(idx+1)+'/'+total+' 通目♡ ★「共有（JSONファイル）」がおすすめ（長い本文はGmailで消えるよ）')
      :'📷 写真つきだよ。★「共有（JSONファイル）」がおすすめ♡ 長い本文はGmailで消えることがあるよ';
    var firstBtn=ov.querySelector('#yzShare')||ov.querySelector('#yzMail');
    if(firstBtn&&firstBtn.parentNode) firstBtn.parentNode.insertBefore(tip,firstBtn);
  }
  /* Clarify part labels; keep ★おすすめ on share when photos */
  if(total>1){
    var sh=ov.querySelector('#yzShare');
    if(sh) sh.textContent='📤 '+(idx+1)+'/'+total+' を共有（JSONファイル）★おすすめ';
    var a=ov.querySelector('#yzMail');
    if(a) a.textContent='📧 '+(idx+1)+'/'+total+' をメール（コピー貼り付け）';
    var cp=ov.querySelector('#yzCopy');
    if(cp) cp.textContent='📋 '+(idx+1)+'/'+total+' をコピー';
  }
  var pendingPP=full.profile_photos;
  var pendingPF=isFirst?full.profile_fields:null;
  var pendingPO=isFirst?full.profile_order:null;
  var advanced=false;
  function advance(){
    if(advanced) return; advanced=true;
    Promise.resolve(markPhotosSent(pendingPP||{})).then(function(){
      if(pendingPF&&Object.keys(pendingPF).length) markFieldsSent(pendingPF);
      if(pendingPO&&pendingPO.length) markOrderSent();
      try{ if(window.yzSentStatus&&window.yzSentStatus.markPending) setTimeout(function(){window.yzSentStatus.markPending()},30) }catch(e){}
      try{ if(window.yzSentStatus&&window.yzSentStatus.reload) setTimeout(function(){window.yzSentStatus.reload()},120) }catch(e){}
      try{ if(typeof window.updatePendSt==='function') window.updatePendSt() }catch(e){}
      if(idx+1<total){
        setTimeout(function(){
          if(confirm('✅ '+(idx+1)+'/'+total+' 通目の準備できたよ。つづきの '+(idx+2)+'/'+total+' を送る？')){
            openPartSheet(parts, idx+1, ctx);
          }else{
            alert('残りはあとで 💌 ゆずに送る／更新 をもう一度押せば送れるよ（送済みの写真はスキップ）');
          }
        }, 400);
      }else if(total>1){
        setTimeout(function(){ alert('全部 '+total+' 通の準備おわったよ💖 ゆず側でマージするね'); }, 400);
      }
    }).catch(function(e){ console.warn('mark sent',e) });
  }
  function commitSent(){ advance() }
  ['#yzMail','#yzShare','#yzCopy'].forEach(function(sel){
    var el=ov.querySelector(sel); if(!el||el.__omCommit) return;
    el.__omCommit=1;
    el.addEventListener('click',commitSent,false);
  });
}

window.omSend=function(){
  return (async function(){
    try{
      var all=await photosReady();
      /* if everything marked sent but photos exist, unmark so re-send works */
      var need=false,pend=0,has=0;
      Object.keys(all||{}).forEach(function(n){(all[n]||[]).forEach(function(s){
        if(s&&s.data){has++; if(s.sent)need=true; else pend++}
      })});
      if(need&&pend===0&&has){
        Object.keys(all).forEach(function(n){(all[n]||[]).forEach(function(s){if(s&&s.data)s.sent=false})});
        if(window.omPfStore) await window.omPfStore.saveAll(all);
        else lsSet('om_pf_photos',all);
        window.__OM_PF_PHOTOS=all;
      }
      var pp=pendingFromAll(all);
      var flat=window.omPfStore?window.omPfStore.groupPending(pp):[];
      if(!flat.length){
        Object.keys(pp).forEach(function(nm){(pp[nm]||[]).forEach(function(it){flat.push({name:nm,slot:it.slot,jpeg:it.jpeg,mime:it.mime})})});
      }
      var R=g(K.r,{}),P=g(K.p,{});
      var pf=pendingProfileFields(), po=pendingProfileOrder();
      var nfe=Object.keys(pf).length, nord=(po&&po.length)?1:0;
      var tc=(function(){try{return JSON.parse(localStorage.getItem('om_top_comments')||'{}')||{}}catch(e){return {}}})();
      var ntc=Object.keys(tc).reduce(function(s,k){return s+(tc[k]||[]).length},0);
      if(!Object.keys(R).length&&!Object.keys(P).length&&!flat.length&&!nfe&&!nord&&!ntc){
        alert('まだリアクションも返事も写真もコメントもないよ💖'); return;
      }
      var batches=flat.length? (window.omPfStore?window.omPfStore.chunk(flat,PHOTO_BATCH):[flat]) : [[]];
      if(!flat.length) batches=[[]];
      var batchId=jst().slice(0,16).replace(/[^0-9]/g,'')+'-'+Math.random().toString(36).slice(2,7);
      var parts=batches.map(function(list,i){
        var photos=list.length?(window.omPfStore?window.omPfStore.toProfilePhotos(list):pendingFromAll({/*unused*/})) : {};
        if(list.length && !Object.keys(photos).length){
          photos={}; list.forEach(function(it){ if(!photos[it.name])photos[it.name]=[]; photos[it.name].push({slot:it.slot,jpeg:it.jpeg,mime:it.mime||'image/jpeg'}) });
        }
        var extra={profile_photos:photos};
        if(batches.length>1 || flat.length){
          extra.part=i+1; extra.parts=Math.max(1,batches.length); extra.batch_id=batchId;
        }
        var payload;
        if(i===0){
          payload=baseSnap(extra);
        }else{
          /* later parts: photos only (+ merge keys) so each mail stays smaller */
          payload={app:'omoide',v:8,sent:jst().slice(0,16),reactions:{},replies:{},
            profile_photos:photos,part:i+1,parts:batches.length,batch_id:batchId,
            part_of:batchId};
        }
        return {payload:payload, list:list};
      });
      openPartSheet(parts, 0, {});
    }catch(e){
      var msg=(e&&e.message)||String(e);
      if(/quota/i.test(msg)|| (e&&e.name==='QuotaExceededError')){
        alert('端末の保存容量がいっぱいだったよ。写真はIndexedDBに移したから、もう一度💌を押してね（写真は消えてないよ）');
        try{ if(window.omPfStore) await window.omPfStore.migrate() }catch(x){}
      }else{
        alert('送れなかったよ：'+msg);
      }
    }
  })();
};

window.omBackup=function(){
  (async function(){
    var all=await photosReady();
    var o=baseSnap({profile_photos:pendingFromAll(all)});
    o.kind='backup'; o.history=g(K.h,[]);
    /* backup file may include photos — download as file, never write to localStorage */
    var s=JSON.stringify(o,null,1), name='omoide-backup-'+jst().slice(0,10).replace(/-/g,'')+'.json';
    try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}catch(e){}
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText) await navigator.clipboard.writeText(s);
    }catch(e){
      try{var x=document.createElement('textarea');x.value=s;x.style.cssText='position:fixed;top:-1000px';document.body.appendChild(x);x.select();document.execCommand('copy');x.remove()}catch(e2){}
    }
    alert('📦 バックアップを保存＆コピーしたよ（'+name+'）※写真はファイル側。localStorageには書いてないよ');
  })();
};
window.omRestore=function(arg){
  var s=(typeof arg==='string')?arg:prompt('バックアップのJSONを貼り付けてね（今のデータは消さずに足すだけだよ）');if(!s)return;
  var o;try{o=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))}catch(e){alert('JSONが読めなかったよ💦');return}
  var add=0;function m(k,src,conv){var cur=g(k,{});Object.keys(src||{}).forEach(function(i){if(cur[i]==null){cur[i]=conv?conv(src[i]):src[i];add++}});lsSet(k,cur)}
  m(K.r,o.reactions);m(K.p,o.replies,function(v){return typeof v==='string'?{t:v}:v});m(K.d,o.read);m('om_ack',o.ack);m('om_ackrp',o.ackrp);m('om_seenrp',o.seenrp);if(o.filt&&!localStorage.getItem('om_filt'))lsSet('om_filt',o.filt);if(Array.isArray(o.marks)&&!localStorage.getItem('om_marks'))lsSet('om_marks',o.marks);
  if(o.closeness){var cl=o.closeness;if(cl.lv){var lv=g('om_lv',{});Object.keys(cl.lv).forEach(function(k){lv[k]=Math.max(lv[k]||1,cl.lv[k]||1)});lsSet('om_lv',lv)}
   if(cl.peak){var pk=g('om_pts_peak',{});Object.keys(cl.peak).forEach(function(k){pk[k]=Math.max(pk[k]||0,cl.peak[k]||0)});lsSet('om_pts_peak',pk)}
   if(cl.open!=null)lsSet('om_close_open',!!cl.open)}
  if(Array.isArray(o.profile_order)&&o.profile_order.length){try{var ff=g('om_pf_fields',{});ff.__order=o.profile_order;lsSet('om_pf_fields',ff)}catch(e){}}
  if(o.top_comments&&typeof o.top_comments==='object'){
    var cur=g('om_top_comments',{});
    Object.keys(o.top_comments).forEach(function(who){
      if(!cur[who])cur[who]=[];
      var seen={};cur[who].forEach(function(x){seen[(x.date||'')+'|'+(x.text||'')]=1});
      (o.top_comments[who]||[]).forEach(function(x){
        if(!x||!x.text)return;
        var k=(x.date||'')+'|'+(x.text||'');
        if(!seen[k]){cur[who].push(x);seen[k]=1;add++}
      });
    });
    lsSet('om_top_comments',cur);
  }
  if(Array.isArray(o.history)){var h=g(K.h,[]),seen={};h.forEach(function(x){seen[x.sent]=1});o.history.forEach(function(x){if(!seen[x.sent])h.push(histLite(x))});lsSet(K.h,h.slice(-30))}
  /* restore photos into IDB if present */
  if(o.profile_photos&&window.omPfStore){
    (async function(){
      var all=await window.omPfStore.loadAll();
      Object.keys(o.profile_photos).forEach(function(nm){
        if(!all[nm]) all[nm]=[];
        (o.profile_photos[nm]||[]).forEach(function(it){
          var slot=+it.slot||0; while(all[nm].length<=slot) all[nm].push(null);
          var data=it.jpeg||it.data||'';
          if(data&&data.indexOf('data:')!==0) data='data:image/jpeg;base64,'+data;
          if(data) all[nm][slot]={data:data,sent:false,at:Date.now()};
        });
      });
      await window.omPfStore.saveAll(all);
      alert(add+'件たしたよ💖（写真もIndexedDBへ）'); location.reload();
    })();
    return;
  }
  alert(add+'件たしたよ💖');location.reload();
};
window.omRestoreYuzu=function(b){window.OM_RST=(b&&b.dataset.k)||window.OM_RST;if(!confirm('ゆずが保管してるバックアップを読み込むよ（今のデータは消さずに足すだけ）。いい？'))return;fetch('data/restore/'+(window.OM_RST||'')+'.json?'+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(t){window.omRestore(t)}).catch(function(){alert('読み込めなかったよ💦ゆずに教えてね')})};
window.omSnap=snapSync;
})();
