/* 思い出ノート: 送る・バックアップ・復元（データは消さない／マージのみ） */
(function(){
var K={r:'om_react',p:'om_reply',d:'om_read',h:'om_sent_history'};
function g(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function jst(){return new Date(Date.now()+9*3600e3).toISOString()}
function snap(){var c=(window.__OM_CLOSE)||{};return {app:'omoide',v:4,sent:jst().slice(0,16),reactions:g(K.r,{}),replies:g(K.p,{}),read:g(K.d,{}),ack:g('om_ack',{}),ackrp:g('om_ackrp',{}),filt:localStorage.getItem('om_filt')||'all',seenrp:g('om_seenrp',{}),marks:(function(){try{return JSON.parse(localStorage.getItem('om_marks')||'null')}catch(e){return null}})(),closeness:{scores:c.scores||{},total:c.total||0,lv:g('om_lv',{}),peak:g('om_pts_peak',{}),open:g('om_close_open',false)}}}
window.omSend=function(){
  var R=g(K.r,{}),P=g(K.p,{});
  if(!Object.keys(R).length&&!Object.keys(P).length){alert('まだリアクションも返事もないよ💖');return}
  var t=jst(),ymd=t.slice(0,10).replace(/-/g,''),full=snap();
  var lite=function(q){var o={app:'omoide',v:2,sent:full.sent,reactions:R,replies:{}};Object.keys(P).forEach(function(k){var x=P[k],y={t:x.t};if(x.n)y.n=x.n;if(q&&x.q)y.q=x.q;o.replies[k]=y});return o};
  var nr=Object.keys(R).length,np=Object.keys(P).length;
  var intro=function(note){return 'ゆずへ💌 思い出ノートのリアクションと返事だよ（'+(+t.slice(5,7))+'/'+(+t.slice(8,10))+'）\nリアクション '+nr+'・返事 '+np+(note?'\n'+note:'')};
  var h=g(K.h,[]);h.push(full);while(h.length>30)h.shift();localStorage.setItem(K.h,JSON.stringify(h));
  yuzuSend({subject:'ゆずとみんなへ 思い出ノート '+jst().slice(0,10)+' omoide-backup-'+ymd,intro:intro,
    levels:[{data:full,note:''},{data:lite(true),note:'（既読はなし）'},{data:lite(false),note:'（既読・引用文なし、行番号だけ）'}],
    full:full,theme:{bg:'#fff',fg:'#2f3a45',acc:'#d0477a',btn:'linear-gradient(90deg,#ff8fb3,#d0567f)',btnfg:'#fff',sub:'#ffe3ee'}})};
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
  if(Array.isArray(o.history)){var h=g(K.h,[]),seen={};h.forEach(function(x){seen[x.sent]=1});o.history.forEach(function(x){if(!seen[x.sent])h.push(x)});localStorage.setItem(K.h,JSON.stringify(h.slice(-30)))}
  alert(add+'件たしたよ💖');location.reload()};
})();
