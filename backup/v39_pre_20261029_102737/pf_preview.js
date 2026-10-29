/* v38: 端末に保存したプロフィール写真をノートのアイコンにも仮表示（公開前） */
(function(){
function load(){try{return JSON.parse(localStorage.getItem('om_pf_photos')||'{}')||{}}catch(e){return {}}}
function firstData(slots){if(!Array.isArray(slots))return null;for(var i=0;i<slots.length;i++){if(slots[i]&&slots[i].data)return slots[i]}return null}
function badge(el,pending){
  if(!el)return;
  var b=el.querySelector('.pfPend');
  if(!pending){if(b)b.remove();return}
  if(!b){b=document.createElement('span');b.className='pfPend';b.textContent='仮';b.title='端末だけの未公開写真';
    b.style.cssText='position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);z-index:3;font-size:9px;font-weight:800;background:#ffe08a;color:#8a5a10;border-radius:6px;padding:0 4px;line-height:1.3;box-shadow:0 0 0 1px #fff';
    if(getComputedStyle(el).position==='static')el.style.position='relative';
    el.appendChild(b)}
}
function putImg(host, dataUrl, size){
  if(!host||!dataUrl)return;
  var img=host.querySelector('img');
  var ic=host.querySelector('.ic,span:not(.ago):not(.pfPend):not(.nbd):not(.clMed)');
  if(!img){
    img=document.createElement('img');
    img.alt='';img.width=size;img.height=size;
    img.style.cssText='width:'+size+'px;height:'+size+'px;object-fit:cover;border-radius:50%;display:block';
    if(ic&&ic.tagName!=='IMG'&&!ic.classList.contains('ago'))ic.replaceWith(img);
    else host.insertBefore(img, host.firstChild);
  }
  if(img.dataset.pfLocal!==dataUrl){img.src=dataUrl;img.dataset.pfLocal=dataUrl}
  img.classList.add('av');
}
function apply(){
  var all=load(), n=0;
  Object.keys(all).forEach(function(name){
    var slot=firstData(all[name]); if(!slot)return;
    var pending=!slot.sent;
    var mem=document.getElementById('m-'+name);
    if(mem){
      var avw=mem.querySelector('.avw');
      if(avw){putImg(avw, slot.data, 64); badge(avw, pending); n++}
    }
    var a=document.querySelector('#mbar a[href="#m-'+name+'"]');
    if(a){
      var mi=a.querySelector('.mi')||a;
      putImg(mi, slot.data, 48); badge(mi, pending);
    }
  });
  return n;
}
function start(){apply(); setTimeout(apply,800); document.addEventListener('visibilitychange',function(){if(!document.hidden)apply()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.__OM_PF_PREVIEW={reload:apply};
})();
