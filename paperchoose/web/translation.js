'use strict';
// Plain scripts share the workbench's state and strict invalidation functions.
(()=>{
 let pending=null, busy=false, pairs=[];
 function buttons(){
  for(const [id,source,target] of [['translate-en','zh','en'],['translate-zh','en','zh']]){
   $(id).disabled=busy||!pairs.some(p=>p.source===source&&p.target===target);
  }
 }
 async function refresh(){
  try{
   const response=await fetch('/api/translation/status');
   if(!response.ok)throw new Error('无法读取翻译状态。');
   const status=await response.json();pairs=status.pairs;
   $('translation-status').textContent=`${status.engine}${status.version?' '+status.version:''} · ${status.message} 每次最多 ${status.max_chars} 个字符。`;
  }catch(error){pairs=[];$('translation-status').textContent=error.message;}
  buttons();
 }
 async function translate(source,target){
  const key=source==='zh'?'chinese':'english';
  const snapshot={chinese:state.chinese,english:state.english};
  const revision=state.revision;
  if(!snapshot[key].trim())throw new Error('请先在对应的原稿框中放入文字。');
  busy=true;pending=null;$('translation-result').hidden=true;buttons();
  notice('正在本机翻译，首次加载可能较慢。原稿尚未改变…');
  try{
   const result=await api('/api/translate',{text:snapshot[key],source,target});
   if(state.revision!==revision||state.chinese!==snapshot.chinese||state.english!==snapshot.english){
    notice('翻译期间稿件或选择已变化，这份旧译文未采用。请重新翻译。',true);return;
   }
   pending={result,snapshot,revision,target,adopted:false};
   $('translation-text').textContent=result.translated_text;
   $('translation-info').textContent=`${result.engine.name} ${result.engine.version} · ${source} → ${target} · 模型 ${result.engine.model_version}。译文尚未采用。`;
   $('translation-result').hidden=false;$('translation-use').disabled=false;
   notice('译文已生成。请阅读预览，确认后再采用。');
  }finally{busy=false;buttons();}
 }
 $('translate-en').addEventListener('click',handle(()=>translate('zh','en')));
 $('translate-zh').addEventListener('click',handle(()=>translate('en','zh')));
 $('translation-refresh').addEventListener('click',handle(refresh));
 $('translation-use').addEventListener('click',handle(async()=>{
  if(!pending||pending.adopted)throw new Error('请先生成新的译文。');
  if(state.revision!==pending.revision||state.chinese!==pending.snapshot.chinese||state.english!==pending.snapshot.english){
   $('translation-use').disabled=true;throw new Error('稿件或选择已经变化，旧译文不能直接采用。请重新翻译。');
  }
  const key=pending.target==='zh'?'chinese':'english';
  if(state[key]&&!window.confirm('采用译文将替换页面中的对应文本，并使旧修改清单失效。原文本仍在本次翻译记录中，请及时下载。继续吗？'))return;
  state[key]=pending.result.translated_text;$(key).value=state[key];
  state.audit='';$('audit').value='';$('audit-filename').textContent='请为当前版本重新核对';invalidateAudit();
  pending.adopted=true;$('translation-use').disabled=true;
  $(key+'-meta').textContent='已采用本地机翻；请人工核对含义。';
  $('translation-info').textContent+=' 已采用到页面；旧核对结果已清除。';
  notice(key==='chinese'?'中文阅读稿已放入页面，请按你的原意检查和修订，再核对英文。':'英文译稿已放入页面，可以导出核对请求。');
 }));
 $('translation-save').addEventListener('click',handle(async()=>{
  if(!pending)throw new Error('请先生成译文。');
  const record={...pending.result,input_snapshot:pending.snapshot,adopted:pending.adopted,
   note:'翻译及采用记录，不是语义正确性认证；包含本次中英文，请保存在本地。'};
  download(new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'}),'translation-record.json');
 }));
 refresh();
})();
