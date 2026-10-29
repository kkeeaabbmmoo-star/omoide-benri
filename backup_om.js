/* 思い出ノート: 送る・バックアップ・復元（データは消さない／マージのみ） v39 */
(function(){
var K={r:'om_react',p:'om_reply',d:'om_read',h:'om_sent_history'};
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function jst(){return new Date(Date.now()+9*3600e3).toISOString()}
function pendingProfilePhotos(){try{var all=JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{},out={};Object.keys(all).forEach(function(name){var slots=all[name]||[],pend=[];slots.forEach(function(s,i){if(s&&s.data&&!s.sent){var b=String(s.data).replace(/^data:image\/\w+;base64,/,'');pend.push({slot:i,jpeg:b,mime:'image/jpeg'})}});if(pend.length)out[name]=pend});return out}catch(e){return {}}}
/* v38: 送信シートで写真なしの短縮版だけ送ったあと sent=true で詰まった分を、一度だけ戻す */
(function(){try{if(localStorage.getItem('om_pf_v38_unmark'))return;var all=JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{},ch=false;Object.keys(all).forEach(function(n){(all[n]||[]).forEach(function(s){if(s&&s.data&&s.sent){s.sent=false;ch=true}})});if(ch)localStorage.setItem('om_pf_photos',JSON.stringify(all));localStorage.setItem('om_pf_v38_unmark','1')}catch(e){}})();
function markPhotosSent(pp){try{var all=JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{};Object.keys(pp||{}).forEach(function(name){(pp[name]||[]).forEach(function(it){var a=all[name];if(Array.isArray(a)&&a[it.slot]&&a[it.slot].data){a[it.slot].sent=true;a[it.slot].sentAt=Date.now()}});});localStorage.setItem('om_pf_photos',JSON.stringify(all));window.__OM_PF_PHOTOS=all}catch(e){}}
function unmarkPhotosSent(pp){try{var all=JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{};Object.keys(pp||{}).forEach(function(name){(pp[name]||[]).forEach(function(it){var a=all[name];if(Array.isArray(a)&&a[it.slot]&&a[it.slot].data)a[it.slot].sent=false});});localStorage.setItem('om_pf_photos',JSON.stringify(all));window.__OM_PF_PHOTOS=all}catch(e){}}
/* v35: profile field edits (Eiji) */
function pendingProfileFields(){try{var all=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{},out={};Object.keys(all).forEach(function(name){if(String(name).indexOf('__')===0)return;var f=all[name];if(!f||typeof f!=='object'||Array.isArray(f))return;var clean={};Object.keys(f).forEach(function(k){if(k.indexOf('__')===0)return;if(f[k]!=null&&String(f[k]).trim()!=='')clean[k]=f[k]});if(Object.keys(clean).length)out[name]=clean});return out}catch(e){return {}}}
function markFieldsSent(pf){try{var all=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{};Object.keys(pf||{}).forEach(function(name){if(!all[name])all[name]={};all[name].__sentAt=Date.now()});localStorage.setItem('om_pf_fields',JSON.stringify(all));window.__OM_PF_FIELDS=all}catch(e){}}
/* v36: profile display order (Eiji) */
/* v38: all-member profile field edit (Eiji) + v37 rewards/arrange */
function pendingProfileOrder(){try{var o=JSON.parse(localStorage.getItem('om_pf_seq')||'null');if(Array.isArray(o)&&o.length)return o.filter(function(x){return typeof x==='string'&&x});var f=JSON.parse(localStorage.getItem('om_pf_fields')||'{}')||{};if(Array.isArray(f.__order)&&f.__order.length)return f.__order.filter(function(x){return typeof x==='string'&&x})}catch(e){}return null}
function markOrderSent(){try{localStorage.setItem('om_pf_seq_sent',String(Date.now()))}catch(e){}}
function snap(){var c=(window.__OM_CLOSE)||{},pp=pendingProfilePhotos(),pf=pendingProfileFields(),po=pendingProfileOrder();var o={app:'omoide',v:7,sent:jst().slice(0,16),reactions:g(K.r,{}),replies:g(K.p,{}),read:g(K.d,{}),ack:g('om_ack',{}),ackrp:g('om_ackrp',{}),filt:localStorage.getItem('om_filt')||'all',seenrp:g('om_seenrp',{}),marks:(function(){try{return JSON.parse(localStorage.getItem('om_marks')||'null')}catch(e){return null}})(),profile_photos:pp,profile_fields:pf,closeness:{scores:c.scores||{},total:c.total||0,lv:g('om_lv',{}),peak:g('om_pts_peak',{}),open:g('om_close_open',false)}};if(po)o.profile_order=po;return o}
window.omSend=function(){
  var R=g(K.r,{}),P=g(K.p,{});
  /* v39: sent=trueのまま残った写真を再送できるように戻す（シートが空で何も起きない対策） */
  try{var all=JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{},need=false,pend=0;
    Object.keys(all).forEach(function(n){(all[n]||[]).forEach(function(s){if(s&&s.data){if(s.sent)need=true;else pend++}})});
    if(need&&pend===0){Object.keys(all).forEach(function(n){(all[n]||[]).forEach(function(s){if(s&&s.data)s.sent=false})});localStorage.setItem('om_pf_photos',JSON.stringify(all));window.__OM_PF_PHOTOS=all}
  }catch(e){}
  var t=jst(),ymd=t.slice(0,10).replace(/-/g,''),full=snap();
  var nph=Object.keys(full.profile_photos||{}).length;
  var nfe=Object.keys(full.profile_fields||{}).length;
  var nord=(full.profile_order&&full.profile_order.length)?1:0;
  if(!Object.keys(R).length&&!Object.keys(P).length&&!nph&&!nfe&&!nord){alert('まだリアクションも返事も写真もないよ💖');return}
  var lite=function(q){var o={app:'omoide',v:2,sent:full.sent,reactions:R,replies:{}};Object.keys(P).forEach(function(k){var x=P[k],y={t:x.t};if(x.n)y.n=x.n;if(q&&x.q)y.q=x.q;o.replies[k]=y});return o};
  var nr=Object.keys(R).length,np=Object.keys(P).length;
  var intro=function(note){var npf=Object.keys(full.profile_photos||{}).reduce(function(s,k){return s+(full.profile_photos[k]||[]).length},0);var nf=Object.keys(full.profile_fields||{}).length;return 'ゆずへ💌 思い出ノートのリアクションと返事だよ（'+(+t.slice(5,7))+'/'+(+t.slice(8,10))+'）\nリアクション '+nr+'・返事 '+np+(npf?'・プロフィール写真 '+npf+'枚':'')+(nf?'・プロフィール欄更新 '+nf+'人':'')+(full.profile_order?'・並び順更新':'')+(note?'\n'+note:'')};
  var h=g(K.h,[]);h.push(full);while(h.length>30)h.shift();localStorage.setItem(K.h,JSON.stringify(h));
  /* v38: 写真があるときは短縮版(lite)に落とさない（写真が消えて sent だけ立つ不具合の原因） */
  var levels=nph?[{data:full,note:nph?'（写真あり・長いのでメールはコピー貼り付けになるよ）':''}]:[{data:full,note:''},{data:lite(true),note:'（既読はなし）'},{data:lite(false),note:'（既読・引用文なし、行番号だけ）'}];
  var pendingPP=full.profile_photos, pendingPF=full.profile_fields, pendingPO=full.profile_order;
  var hasPhotos=!!(pendingPP&&Object.keys(pendingPP).length);
  yuzuSend({subject:'ゆずとみんなへ 思い出ノート '+jst().slice(0,10)+' omoide-backup-'+ymd,intro:intro,
    levels:levels,full:full,fullNote:hasPhotos?'※プロフィール写真つき。共有かコピーが確実だよ':undefined,
    theme:{bg:'#fff',fg:'#2f3a45',acc:'#d0477a',btn:'linear-gradient(90deg,#ff8fb3,#d0567f)',btnfg:'#fff',sub:'#ffe3ee'}});
  var ov=document.getElementById('yzSendOv');
  if(ov){
    if(hasPhotos){
      var tip=document.createElement('div');
      tip.style.cssText='font-size:13px;line-height:1.45;margin:8px 0;padding:8px 10px;border-radius:12px;background:#fff6e8;color:#8a5a10;font-weight:700';
      tip.textContent='📷 写真つきだよ。📧メールは長いので本文コピー→貼り付け、または📤共有がおすすめ♡';
      var firstBtn=ov.querySelector('#yzMail');
      if(firstBtn&&firstBtn.parentNode)firstBtn.parentNode.insertBefore(tip,firstBtn);
    }
    function commitSent(ev){
      var id=ev&&ev.currentTarget&&ev.currentTarget.id;
      /* メールで短縮版だけ送られた場合は写真を sent にしない（v38） */
      var mailedFull=true;
      try{
        if(id==='yzMail'){
          var a=ov.querySelector('#yzMail');
          var href=(a&&a.getAttribute('href'))||'';
          /* pick が null のときは onclick で full をコピー済み。lite のときだけ写真なし */
          if(hasPhotos&&href.indexOf('mailto:')===0){
            /* levels が full のみなので、合うなら full、合わなければ short+copy(full)。どちらも写真は届く想定 */
            mailedFull=true;
          }
        }
      }catch(e){}
      if(pendingPP&&Object.keys(pendingPP).length&&mailedFull)markPhotosSent(pendingPP);
      if(pendingPF&&Object.keys(pendingPF).length)markFieldsSent(pendingPF);
      if(pendingPO&&pendingPO.length)markOrderSent();
      pendingPP=null;pendingPF=null;pendingPO=null;
      try{if(window.yzSentStatus&&window.yzSentStatus.markPending)setTimeout(function(){window.yzSentStatus.markPending()},30)}catch(e){}
      try{if(window.yzSentStatus&&window.yzSentStatus.reload)setTimeout(function(){window.yzSentStatus.reload()},120)}catch(e){}
    }
    ['#yzMail','#yzShare','#yzCopy'].forEach(function(sel){
      var el=ov.querySelector(sel);if(!el||el.__omCommit)return;
      el.__omCommit=1;
      el.addEventListener('click',commitSent,false);
    });
  }
};
window.omBackup=function(){
  var o=snap();o.kind='backup';o.history=g(K.h,[]);var s=JSON.stringify(o,null,1),name='omoide-backup-'+jst().slice(0,10).replace(/-/g,'')+'.json';
  try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([s],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}catch(e){}
  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(s):Promise.reject()).catch(function(){var x=document.createElement('textarea');x.value=s;x.style.cssText='position:fixed;top:-1000px';document.body.appendChild(x);x.select();try{document.execCommand('copy')}catch(e){}x.remove()});
  alert('📦 バックアップを保存＆コピーしたよ（'+name+'）')};
window.omRestore=function(){
  var s=prompt('バックアップのJSONを貼り付けてね（今のデータは消さずに足すだけだよ）');if(!s)return;
  var o;try{o=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))}catch(e){alert('JSONが読めなかったよ💦');return}
  var add=0;function m(k,src,conv){var cur=g(k,{});Object.keys(src||{}).forEach(function(i){if(cur[i]==null){cur[i]=conv?conv(src[i]):src[i];add++}});localStorage.setItem(k,JSON.stringify(cur))}
  m(K.r,o.reactions);m(K.p,o.replies,function(v){return typeof v==='string'?{t:v}:v});m(K.d,o.read);m('om_ack',o.ack);m('om_ackrp',o.ackrp);m('om_seenrp',o.seenrp);if(o.filt&&!localStorage.getItem('om_filt'))localStorage.setItem('om_filt',o.filt);if(Array.isArray(o.marks)&&!localStorage.getItem('om_marks'))localStorage.setItem('om_marks',JSON.stringify(o.marks));
  if(o.closeness){var cl=o.closeness;if(cl.lv){var lv=g('om_lv',{});Object.keys(cl.lv).forEach(function(k){lv[k]=Math.max(lv[k]||1,cl.lv[k]||1)});localStorage.setItem('om_lv',JSON.stringify(lv))}
   if(cl.peak){var pk=g('om_pts_peak',{});Object.keys(cl.peak).forEach(function(k){pk[k]=Math.max(pk[k]||0,cl.peak[k]||0)});localStorage.setItem('om_pts_peak',JSON.stringify(pk))}
   if(cl.open!=null)localStorage.setItem('om_close_open',JSON.stringify(!!cl.open))}
  if(Array.isArray(o.profile_order)&&o.profile_order.length){try{var ff=g('om_pf_fields',{});ff.__order=o.profile_order;localStorage.setItem('om_pf_fields',JSON.stringify(ff))}catch(e){}}
  if(Array.isArray(o.history)){var h=g(K.h,[]),seen={};h.forEach(function(x){seen[x.sent]=1});o.history.forEach(function(x){if(!seen[x.sent])h.push(x)});localStorage.setItem(K.h,JSON.stringify(h.slice(-30)))}
  alert(add+'件たしたよ💖');location.reload()};
})();
