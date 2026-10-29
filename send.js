/* v42: share sends JSON File (Gmail iOS drops long text); short note only */
/* 💌 ゆずとみんなに送る — mailto / navigator.share({files}) / copy. No network. */
(function(){
var TO="k.ke.ea.ab.bm.mo.o@gmail.com",MAX=1800;
function block(o){return "---YUZU-DATA---\n"+JSON.stringify(o)+"\n---END---"}
function mailto(sub,body){return "mailto:"+TO+"?subject="+encodeURIComponent(sub)+"&body="+encodeURIComponent(body)}
function jsonBlob(o){return new Blob([JSON.stringify(o)],{type:"application/json"})}
function jsonFile(o,name){
  try{return new File([JSON.stringify(o)],name,{type:"application/json"})}
  catch(e){return null}
}
function canShareFiles(file){
  try{
    if(!navigator.share||!navigator.canShare) return false;
    if(!file) return false;
    return !!navigator.canShare({files:[file]});
  }catch(e){return false}
}
function downloadBlob(blob,name){
  try{
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){try{URL.revokeObjectURL(a.href)}catch(e){}},2000);
    return true;
  }catch(e){return false}
}
/* opt: {subject, intro, levels, full, fullNote, theme, shareFileName, preferShare} */
window.yuzuSend=function(opt){
  var T=opt.theme,fullText=opt.intro(opt.fullNote||"")+"\n\n"+block(opt.full),pick=null,pickIsFull=false;
  for(var i=0;i<opt.levels.length;i++){
    var b=opt.intro(opt.levels[i].note)+"\n\n"+block(opt.levels[i].data);
    if(mailto(opt.subject,b).length<=MAX){pick={body:b,note:opt.levels[i].note,data:opt.levels[i].data};pickIsFull=(opt.levels[i].data===opt.full);break}
  }
  var needPaste=!pick||!pickIsFull;
  var fname=opt.shareFileName||"omoide_backup.json";
  var preferShare=!!(opt.preferShare||needPaste);
  var fileObj=jsonFile(opt.full,fname);
  var fileOk=canShareFiles(fileObj);
  var shortShareNote=opt.subject+"\n\n📎 JSONファイル「"+fname+"」を添付して送ってね。本文は空でOK♡ ゆずがファイルを読むよ。";
  var mailNote;
  if(preferShare){
    mailNote=fileOk
      ? "📷 長いデータは本文に入れるとGmailで消えるよ。下の「📤 共有（JSONファイル）★おすすめ」でファイル添付してね。"
      : "📷 データが長いよ。共有でファイル添付、または📋コピー／メールに貼り付けてね。";
  }else{
    mailNote=(!needPaste)?(pick.note?"メールには "+pick.note+" を入れたよ。":"ぜんぶメールに入ったよ。"):"内容が長いから、メールには短いお知らせだけ入れて、本文はコピーしておくね。";
  }

  var ov=document.createElement("div");ov.id="yzSendOv";
  ov.style.cssText="position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center";
  var bt="display:block;width:100%;padding:14px;border:0;border-radius:16px;font-size:17px;font-weight:800;margin-top:10px;";
  var btnPrimary=bt+"text-align:center;text-decoration:none;box-sizing:border-box;background:"+T.btn+";color:"+T.btnfg;
  var btnSecondary=bt+"background:"+T.sub+";color:"+T.acc;

  var shareLabel=preferShare
    ? ("📤 共有で送る（JSONファイル）★おすすめ")
    : ("📤 共有で送る（Gmailアプリなど）");
  var mailLabel=preferShare
    ? ("📧 メールで送る（コピーして貼る）")
    : ("📧 メールで送る"+(needPaste?"（コピーして貼る）":"（おすすめ）"));
  var copyLabel="📋 本文をコピー";

  /* Order: recommended first */
  var buttonsHtml;
  if(preferShare){
    buttonsHtml=
      '<button type="button" id="yzShare" style="'+btnPrimary+'">'+shareLabel+'</button>'+
      '<a id="yzMail" style="'+btnSecondary+'">'+mailLabel+'</a>'+
      '<button type="button" id="yzCopy" style="'+btnSecondary+'">'+copyLabel+'</button>';
  }else{
    buttonsHtml=
      '<a id="yzMail" style="'+btnPrimary+'">'+mailLabel+'</a>'+
      '<button type="button" id="yzShare" style="'+btnSecondary+'">'+shareLabel+'</button>'+
      '<button type="button" id="yzCopy" style="'+btnSecondary+'">'+copyLabel+'</button>';
  }

  ov.innerHTML='<div style="background:'+T.bg+';color:'+T.fg+';width:100%;max-width:560px;border-radius:24px 24px 0 0;padding:18px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:86vh;overflow:auto;font-family:-apple-system,\'Hiragino Sans\',sans-serif">'+
   '<div style="font-size:20px;font-weight:800;color:'+T.acc+'">💌 ゆずとみんなに送る</div>'+
   '<div style="font-size:14px;line-height:1.6;margin:6px 0 4px;opacity:.9">エイジのGmail（'+TO+'）あてに送るよ。開いたら<b>送信</b>をタップするだけ♡ ゆずが読んで反映するね。</div>'+
   '<div style="font-size:12.5px;opacity:.85;margin-bottom:6px;line-height:1.45">件名：'+opt.subject.replace(/</g,"&lt;")+'<br>'+mailNote+'</div>'+
   buttonsHtml+
   '<details style="margin-top:12px;font-size:12.5px"><summary style="cursor:pointer;opacity:.8">送る内容を見る</summary><pre id="yzPrev" style="white-space:pre-wrap;word-break:break-all;font-size:11.5px;background:rgba(127,127,127,.12);padding:8px;border-radius:10px;max-height:40vh;overflow:auto"></pre></details>'+
   '<button type="button" id="yzClose" style="'+bt+'background:transparent;color:'+T.fg+';opacity:.7;font-weight:600">とじる</button></div>';
  document.body.appendChild(ov);
  ov.querySelector("#yzPrev").textContent=fullText;

  var shortBody=opt.intro("")+"\n\n（本文が長いので、共有のJSONファイルかコピーした内容を使ってね📋）";
  var a=ov.querySelector("#yzMail");
  a.href=mailto(opt.subject,(!needPaste&&pick)?pick.body:shortBody);
  a.dataset.yzNeedPaste=needPaste?'1':'0';

  function copy(t){return (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){var x=document.createElement("textarea");x.value=t;x.style.cssText="position:fixed;top:-1000px";document.body.appendChild(x);x.select();try{document.execCommand("copy")}catch(e){}x.remove()})}
  function say(m){var d=document.createElement("div");d.textContent=m;d.style.cssText="position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 30px);transform:translateX(-50%);z-index:2147483001;background:#333;color:#fff;padding:9px 16px;border-radius:999px;font-size:14px;opacity:.95";document.body.appendChild(d);setTimeout(function(){d.remove()},2600)}

  a.onclick=function(){
    if(needPaste){
      copy(fullText).then(function(){say("本文をコピーしたよ📋 メールに貼り付けて送信してね")});
    }
    setTimeout(function(){ov.remove()},500);
  };

  ov.querySelector("#yzShare").onclick=function(){
    var file=fileObj||jsonFile(opt.full,fname);
    function fallback(){
      /* 1) download JSON file 2) copy short note 3) try text-only share of short note */
      var ok=downloadBlob(jsonBlob(opt.full),fname);
      copy(shortShareNote).then(function(){
        say(ok
          ? ("JSONを保存したよ📥 Gmailで「"+fname+"」を添付して送ってね")
          : "共有できないから短い案内をコピーしたよ📋 JSONは「送る内容を見る」からコピーしてね");
      });
      if(navigator.share){
        navigator.share({title:opt.subject,text:shortShareNote}).catch(function(){});
      }
    }
    if(file&&canShareFiles(file)){
      navigator.share({
        files:[file],
        title:opt.subject,
        text:shortShareNote
      }).then(function(){ov.remove()}).catch(function(err){
        /* user cancel → stay; other errors → fallback */
        if(err&&(err.name==="AbortError"||/abort/i.test(String(err.message||"")))) return;
        fallback();
      });
      return;
    }
    fallback();
  };

  ov.querySelector("#yzCopy").onclick=function(){
    copy(opt.subject+"\n\n"+fullText).then(function(){say("コピーしたよ📋 メールに貼り付けてね")});
  };
  ov.querySelector("#yzClose").onclick=function(){ov.remove()};
  ov.onclick=function(e){if(e.target===ov)ov.remove()};
  return {
    mailBody:(!needPaste&&pick)?pick.body:shortBody,
    full:fullText,
    payload:opt.full,
    shareFileName:fname,
    fileShare:fileOk,
    fits:!!pick&&pickIsFull,
    note:pick&&pick.note,
    needPaste:needPaste,
    preferShare:preferShare
  };
};
})();
