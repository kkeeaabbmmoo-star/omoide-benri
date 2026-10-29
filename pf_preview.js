/* v39: DISABLED — provisional profile photos must NEVER replace note icons.
   Icons stay each member's real avatar / emoji (すーさん=🍺). */
(function(){
  try{ /* leave om_pf_photos untouched (profile page only) */ }catch(e){}
  window.__OM_PF_PREVIEW={reload:function(){return 0}, disabled:true};
})();
