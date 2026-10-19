'use strict';
// Plain scripts share the workbench's state and strict invalidation functions.
(()=>{
 let pending=null, busy=false, pairs=[];
 function buttons(){
  const [source,target]=$('direction').value.split('-');
  $('translate').disabled=busy||!pairs.some(p=>p.source===source&&p.target===target);
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
  const key='source';
  const snapshot={source:state.source,draft:state.draft};
  const revision=state.revision;
  if(!snapshot[key].trim())throw new Error('请先在对应的原稿框中放入文字。');
  busy=true;pending=null;$('translation-result').hidden=true;buttons();
  notice('正在本机翻译，首次加载可能较慢。原稿尚未改变…');
  try{
   const result=await api('/api/translate',{text:snapshot[key],source,target});
   if(state.revision!==revision||state.source!==snapshot.source||state.draft!==snapshot.draft){
    notice('翻译期间稿件或选择已变化，这份旧译文未采用。请重新翻译。',true);return;
   }
   pending={result,snapshot,revision,target,adopted:false};
   $('translation-text').textContent=result.translated_text;
   $('translation-info').textContent=`${result.engine.name} ${result.engine.version} · ${source} → ${target} · 模型 ${result.engine.model_version}。译文尚未采用。`;
   $('translation-result').hidden=false;$('translation-use').disabled=false;
   notice('译文已生成。可放入待核对译文；此时尚未进行语义核对。');
  }finally{busy=false;buttons();}
 }
 $('translate').addEventListener('click',handle(()=>translate(...$('direction').value.split('-'))));
 document.addEventListener('paperchoose-context',buttons);
 $('translation-refresh').addEventListener('click',handle(refresh));
 $('translation-use').addEventListener('click',handle(async()=>{
  if(!pending||pending.adopted)throw new Error('请先生成新的译文。');
  if(state.revision!==pending.revision||state.source!==pending.snapshot.source||state.draft!==pending.snapshot.draft){
   $('translation-use').disabled=true;throw new Error('稿件或选择已经变化，旧译文不能直接采用。请重新翻译。');
  }
  const key='draft';
  if(state[key]&&!window.confirm('采用译文将替换页面中的对应文本，并使旧修改清单失效。原文本仍在本次翻译记录中，请及时下载。继续吗？'))return;
  state[key]=pending.result.translated_text;$(key).value=state[key];
  state.audit='';$('audit').value='';$('audit-filename').textContent='请为当前版本重新核对';invalidateAudit();
  pending.adopted=true;$('translation-use').disabled=true;
  $(key+'-meta').textContent='已放入本地机翻稿；下一步交给助手核对。';
  $('translation-info').textContent+=' 已采用到页面；旧核对结果已清除。';
  notice('机翻稿已放入待修改区域，原稿保持不变。可以准备一次核对请求。');
 }));
 $('translation-save').addEventListener('click',handle(async()=>{
  if(!pending)throw new Error('请先生成译文。');
  const record={...pending.result,input_snapshot:pending.snapshot,adopted:pending.adopted,
   note:'翻译及采用记录，不是语义正确性认证；包含本次原稿与旧译文，请保存在本地。'};
  download(new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'}),'translation-record.json');
 }));
 refresh();
})();
