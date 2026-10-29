/* v41: profile photos in IndexedDB (localStorage was overflowing). Never delete until migrate verified. */
(function(){
var DB_NAME='omoide_pf_v41', DB_VER=1, STORE='photos';
var LS_KEY='om_pf_photos', LS_META='om_pf_meta', LS_MIG='om_pf_idb_ok', LS_LEGACY='om_pf_photos_legacy';
var MAX_EDGE=720, JPEG_Q=0.8;

function openDB(){
  return new Promise(function(res,rej){
    try{
      var r=indexedDB.open(DB_NAME,DB_VER);
      r.onupgradeneeded=function(){var db=r.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'name'})};
      r.onsuccess=function(){res(r.result)};
      r.onerror=function(){rej(r.error||new Error('idb open'))};
    }catch(e){rej(e)}
  });
}
function idbReq(req){return new Promise(function(res,rej){req.onsuccess=function(){res(req.result)};req.onerror=function(){rej(req.error)}})}
function txDone(tx){return new Promise(function(res,rej){tx.oncomplete=function(){res()};tx.onerror=function(){rej(tx.error)};tx.onabort=function(){rej(tx.error||new Error('abort'))}})}

function lsGet(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function lsSet(k,v){
  try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));return true}
  catch(e){
    if(e&&(e.name==='QuotaExceededError'||e.code===22||/quota/i.test(String(e.message||e)))) return false;
    return false;
  }
}
function stripData(all){
  var out={};
  Object.keys(all||{}).forEach(function(nm){
    out[nm]=(all[nm]||[]).map(function(s){
      if(!s||!s.data) return s;
      return {sent:!!s.sent,at:s.at||0,sentAt:s.sentAt||0,bytes:String(s.data).length,has:1};
    });
  });
  return out;
}
function countPhotos(all){
  var n=0; Object.keys(all||{}).forEach(function(nm){(all[nm]||[]).forEach(function(s){if(s&&s.data)n++})}); return n;
}
function fingerprint(all){
  var n=0,f=0,pend=0;
  Object.keys(all||{}).forEach(function(nm){(all[nm]||[]).forEach(function(s,i){
    if(s&&s.data){n++; if(!s.sent)pend++; f+=(s.sent?10:1)*(i+1)+String(s.data).length%997}
  })});
  return 'p'+n+'u'+pend+'x'+f;
}

function compressDataUrl(dataUrl,maxEdge,q){
  return new Promise(function(res){
    try{
      if(!dataUrl||String(dataUrl).indexOf('data:image')!==0){res(dataUrl);return}
      var img=new Image();
      img.onload=function(){
        try{
          var w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
          if(!w||!h){res(dataUrl);return}
          var scale=Math.min(1, maxEdge/Math.max(w,h));
          var nw=Math.max(1,Math.round(w*scale)), nh=Math.max(1,Math.round(h*scale));
          var c=document.createElement('canvas'); c.width=nw; c.height=nh;
          c.getContext('2d').drawImage(img,0,0,nw,nh);
          var out=c.toDataURL('image/jpeg',q);
          /* keep smaller of the two */
          res((out&&out.length<dataUrl.length)?out:dataUrl);
        }catch(e){res(dataUrl)}
      };
      img.onerror=function(){res(dataUrl)};
      img.src=dataUrl;
    }catch(e){res(dataUrl)}
  });
}

async function idbGetAll(){
  var db=await openDB();
  var tx=db.transaction(STORE,'readonly');
  var all=await idbReq(tx.objectStore(STORE).getAll());
  await txDone(tx); db.close();
  var out={};
  (all||[]).forEach(function(row){ if(row&&row.name) out[row.name]=row.slots||[] });
  return out;
}
async function idbPutName(name,slots){
  var db=await openDB();
  var tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put({name:name,slots:slots||[]});
  await txDone(tx); db.close();
}
async function idbPutAll(all){
  var db=await openDB();
  var tx=db.transaction(STORE,'readwrite');
  var st=tx.objectStore(STORE);
  Object.keys(all||{}).forEach(function(nm){ st.put({name:nm,slots:all[nm]||[]}) });
  await txDone(tx); db.close();
}

async function migrate(){
  var flag=localStorage.getItem(LS_MIG);
  var lsAll=lsGet(LS_KEY,{});
  var hasLS=countPhotos(lsAll)>0;
  if(flag==='1'&&!hasLS){
    var cur=await idbGetAll();
    window.__OM_PF_PHOTOS=cur;
    lsSet(LS_META,stripData(cur));
    return {ok:true,migrated:false,count:countPhotos(cur)};
  }
  /* Load existing IDB (may be partial) and merge LS on top without losing either */
  var idbAll=await idbGetAll();
  var merged={}, names={};
  Object.keys(idbAll||{}).forEach(function(n){names[n]=1});
  Object.keys(lsAll||{}).forEach(function(n){names[n]=1});
  Object.keys(names).forEach(function(nm){
    var a=Array.isArray(idbAll[nm])?idbAll[nm].slice():[];
    var b=Array.isArray(lsAll[nm])?lsAll[nm].slice():[];
    var lim=Math.max(a.length,b.length,10);
    var out=[];
    for(var i=0;i<lim;i++){
      var L=b[i], I=a[i];
      if(L&&L.data) out[i]=L;
      else if(I&&I.data) out[i]=I;
      else out[i]=L||I||null;
    }
    while(out.length&&out[out.length-1]==null) out.pop();
    if(out.length) merged[nm]=out;
  });
  /* Write originals to IDB first */
  await idbPutAll(merged);
  var verify=await idbGetAll();
  var c0=countPhotos(merged), c1=countPhotos(verify);
  if(c1<c0){
    console.warn('pf_store migrate verify fail',c0,c1);
    window.__OM_PF_PHOTOS=merged;
    return {ok:false,migrated:false,count:c1,error:'verify'};
  }
  /* Compress in IDB (keep if compress fails) */
  var compressed={};
  for(var nm of Object.keys(verify)){
    var slots=(verify[nm]||[]).slice();
    for(var i=0;i<slots.length;i++){
      if(slots[i]&&slots[i].data){
        var d=await compressDataUrl(slots[i].data,MAX_EDGE,JPEG_Q);
        slots[i]=Object.assign({},slots[i],{data:d,compressed:true});
      }
    }
    compressed[nm]=slots;
  }
  await idbPutAll(compressed);
  var verify2=await idbGetAll();
  if(countPhotos(verify2)<c0){
    /* restore uncompressed originals already in IDB from earlier put */
    await idbPutAll(verify);
    verify2=verify;
  }
  /* Free localStorage: move raw LS aside only if we can; then remove heavy key */
  if(hasLS){
    /* try keep a tiny pointer; never require writing the full blob back */
    lsSet(LS_LEGACY,'moved-to-idb:'+fingerprint(verify2)+':'+Date.now());
    try{localStorage.removeItem(LS_KEY)}catch(e){}
  }
  try{localStorage.setItem(LS_MIG,'1')}catch(e){}
  lsSet(LS_META,stripData(verify2));
  window.__OM_PF_PHOTOS=verify2;
  return {ok:true,migrated:hasLS,count:countPhotos(verify2)};
}

async function loadAll(){
  if(!window.__OM_PF_READY){
    try{ await migrate() }catch(e){ console.warn('pf migrate',e); window.__OM_PF_PHOTOS=lsGet(LS_KEY,{}) }
    window.__OM_PF_READY=true;
  }
  if(window.__OM_PF_PHOTOS) return window.__OM_PF_PHOTOS;
  var all=await idbGetAll();
  window.__OM_PF_PHOTOS=all;
  return all;
}
async function saveAll(all){
  window.__OM_PF_PHOTOS=all||{};
  await idbPutAll(all||{});
  lsSet(LS_META,stripData(all||{}));
  /* never write full base64 back to om_pf_photos */
  try{ if(localStorage.getItem(LS_KEY)) localStorage.removeItem(LS_KEY) }catch(e){}
}
async function setSlots(name,slots){
  var all=await loadAll();
  all[name]=slots;
  await saveAll(all);
}
function pendingList(all){
  var list=[];
  Object.keys(all||{}).forEach(function(name){
    (all[name]||[]).forEach(function(s,i){
      if(s&&s.data&&!s.sent){
        var b=String(s.data).replace(/^data:image\/\w+;base64,/,'');
        list.push({name:name,slot:i,jpeg:b,mime:'image/jpeg',bytes:b.length});
      }
    });
  });
  return list;
}
async function markSentPairs(pairs){
  var all=await loadAll();
  (pairs||[]).forEach(function(it){
    var a=all[it.name];
    if(Array.isArray(a)&&a[it.slot]&&a[it.slot].data){
      a[it.slot].sent=true; a[it.slot].sentAt=Date.now();
    }
  });
  await saveAll(all);
}
async function unmarkSentPairs(pairs){
  var all=await loadAll();
  (pairs||[]).forEach(function(it){
    var a=all[it.name];
    if(Array.isArray(a)&&a[it.slot]&&a[it.slot].data) a[it.slot].sent=false;
  });
  await saveAll(all);
}
function groupPending(pp){
  /* pp: {name:[{slot,jpeg}]} → flat list */
  var list=[];
  Object.keys(pp||{}).forEach(function(name){
    (pp[name]||[]).forEach(function(it){ list.push({name:name,slot:it.slot,jpeg:it.jpeg,mime:it.mime||'image/jpeg'}) });
  });
  return list;
}
function chunk(arr,n){
  var out=[]; for(var i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out;
}
function toProfilePhotos(list){
  var out={};
  list.forEach(function(it){
    if(!out[it.name]) out[it.name]=[];
    out[it.name].push({slot:it.slot,jpeg:it.jpeg,mime:it.mime||'image/jpeg'});
  });
  return out;
}

window.omPfStore={
  migrate:migrate, loadAll:loadAll, saveAll:saveAll, setSlots:setSlots,
  pendingList:pendingList, markSentPairs:markSentPairs, unmarkSentPairs:unmarkSentPairs,
  compressDataUrl:compressDataUrl, fingerprint:fingerprint, countPhotos:countPhotos,
  chunk:chunk, toProfilePhotos:toProfilePhotos, groupPending:groupPending,
  lsSet:lsSet, stripData:stripData, MAX_EDGE:MAX_EDGE, JPEG_Q:JPEG_Q
};
})();
