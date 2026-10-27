/* 💌 ゆず・由依・まいに送る — shared send sheet (mailto primary, navigator.share, copy). No network, no data changes. */
(function(){
var TO="k.ke.ea.ab.bm.mo.o@gmail.com",MAX=1800;
function block(o){return "---YUZU-DATA---\n"+JSON.stringify(o)+"\n---END---"}
function mailto(sub,body){return "mailto:"+TO+"?subject="+encodeURIComponent(sub)+"&body="+encodeURIComponent(body)}
/* opt: {subject, intro(fn(levelNote)->text), levels:[{data,note}] (most complete first), full:{data}, theme:{bg,fg,acc,btn,btnfg,sub}} */
window.yuzuSend=function(opt){
  var T=opt.theme,full=opt.intro(opt.fullNote||"")+"\n\n"+block(opt.full),pick=null;
  for(var i=0;i<opt.levels.length;i++){var b=opt.intro(opt.levels[i].note)+"\n\n"+block(opt.levels[i].data);if(mailto(opt.subject,b).length<=MAX){pick={body:b,note:opt.levels[i].note};break}}
  var ov=document.createElement("div");ov.id="yzSendOv";
  ov.style.cssText="position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center";
  var bt="display:block;width:100%;padding:14px;border:0;border-radius:16px;font-size:17px;font-weight:800;margin-top:10px;";
  var mailNote=pick?(pick.note?"メールには "+pick.note+" を入れたよ。":"ぜんぶメールに入ったよ。"):"内容が長いから、メールには短いお知らせだけ入れて、本文はコピーしておくね。メールをひらいたら本文に貼り付けてね📋";
  ov.innerHTML='<div style="background:'+T.bg+';color:'+T.fg+';width:100%;max-width:560px;border-radius:24px 24px 0 0;padding:18px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:86vh;overflow:auto;font-family:-apple-system,\'Hiragino Sans\',sans-serif">'+
   '<div style="font-size:20px;font-weight:800;color:'+T.acc+'">💌 ゆず・由依・まいに送る</div>'+
   '<div style="font-size:14px;line-height:1.6;margin:6px 0 4px;opacity:.9">エイジのGmail（'+TO+'）あてにメールを作るよ。開いたら<b>送信</b>をタップするだけ♡ ゆずが読んで、次の便利ノートに入れるね。</div>'+
   '<div style="font-size:12.5px;opacity:.75;margin-bottom:6px">件名：'+opt.subject.replace(/</g,"&lt;")+'<br>'+mailNote+'</div>'+
   '<a id="yzMail" style="'+bt+'text-align:center;text-decoration:none;box-sizing:border-box;background:'+T.btn+';color:'+T.btnfg+'">📧 メールで送る（おすすめ）</a>'+
   '<button id="yzShare" style="'+bt+'background:'+T.sub+';color:'+T.acc+'">📤 共有で送る（Gmailアプリなど）</button>'+
   '<button id="yzCopy" style="'+bt+'background:'+T.sub+';color:'+T.acc+'">📋 本文をコピー</button>'+
   '<details style="margin-top:12px;font-size:12.5px"><summary style="cursor:pointer;opacity:.8">送る内容を見る</summary><pre id="yzPrev" style="white-space:pre-wrap;word-break:break-all;font-size:11.5px;background:rgba(127,127,127,.12);padding:8px;border-radius:10px;max-height:40vh;overflow:auto"></pre></details>'+
   '<button id="yzClose" style="'+bt+'background:transparent;color:'+T.fg+';opacity:.7;font-weight:600">とじる</button></div>';
  document.body.appendChild(ov);
  ov.querySelector("#yzPrev").textContent=full;
  var shortBody=opt.intro("")+"\n\n（本文が長いのでコピーしてあるよ。ここに貼り付けてから送ってね📋）";
  var a=ov.querySelector("#yzMail");a.href=mailto(opt.subject,pick?pick.body:shortBody);
  function copy(t){return (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){var x=document.createElement("textarea");x.value=t;x.style.cssText="position:fixed;top:-1000px";document.body.appendChild(x);x.select();try{document.execCommand("copy")}catch(e){}x.remove()})}
  function say(m){var d=document.createElement("div");d.textContent=m;d.style.cssText="position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 30px);transform:translateX(-50%);z-index:2147483001;background:#333;color:#fff;padding:9px 16px;border-radius:999px;font-size:14px;opacity:.95";document.body.appendChild(d);setTimeout(function(){d.remove()},1800)}
  a.onclick=function(){if(!pick)copy(full);setTimeout(function(){ov.remove()},400)};
  ov.querySelector("#yzShare").onclick=function(){if(navigator.share){navigator.share({title:opt.subject,text:opt.subject+"\n\n"+full}).then(function(){ov.remove()}).catch(function(){})}else{copy(opt.subject+"\n\n"+full).then(function(){say("共有が使えないからコピーしたよ📋")})}};
  ov.querySelector("#yzCopy").onclick=function(){copy(opt.subject+"\n\n"+full).then(function(){say("コピーしたよ📋 メールに貼り付けてね")})};
  ov.querySelector("#yzClose").onclick=function(){ov.remove()};
  ov.onclick=function(e){if(e.target===ov)ov.remove()};
  return {mailBody:pick?pick.body:shortBody,full:full,fits:!!pick,note:pick&&pick.note};
};
})();
