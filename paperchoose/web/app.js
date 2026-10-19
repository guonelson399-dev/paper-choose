'use strict';
const $=id=>document.getElementById(id);
const state={token:null,source:'',draft:'',audit:'',checked:null,selected:new Set(),plan:null,revision:0};
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function invalidatePlan(){state.revision++;state.plan=null;$('export').disabled=true;$('preview-area').hidden=true;$('preview-summary').textContent='下载包含原稿、机翻稿、新稿、差异与采用记录。';}
function invalidateAudit(){invalidatePlan();state.checked=null;state.selected.clear();$('proposals').replaceChildren();$('empty').hidden=false;$('empty').textContent='请校验当前输入对应的核对结果。';$('preview').disabled=true;$('none').disabled=true;$('selection-count').textContent='已选 0 项';$('reviewer').textContent='核对由你选用的助手或人工提供';$('observations').textContent='尚未核对当前版本。';}
function reviewInput(){return {source:state.source,draft:state.draft,context:reviewContext()};}
function payload(){return {...reviewInput(),audit:state.audit};}
function reviewContext(){const [source_language,target_language]=$('direction').value.split('-');return {source_language,target_language,protection_mode:$('protection-mode').value,protected_terms:$('protected-terms').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),author_notes:$('author-notes').value,reference_original:$('reference-original').value};}
function clearAudit(){state.audit='';$('audit').value='';$('audit-filename').textContent='输入已变化，请重新核对';invalidateAudit();}
function directionLabels(){const en=$('direction').value==='en-zh';$('source-label').textContent=en?'英文原稿':'中文原稿';$('draft-label').textContent=en?'中文机翻稿（待修改）':'英文机翻稿（待修改）';}
function countLabel(c){return c.characters!==undefined?`${c.characters} 字符`:`${c.words} 英文工作流词`;}

async function api(path,data,binary=false){
 if(!state.token)throw new Error('尚未连接本地工具，请刷新页面。');
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-PaperChoose-Token':state.token},body:JSON.stringify(data)});
 if(!response.ok){let body;try{body=await response.json();}catch{throw new Error('本地请求未完成，请检查终端。');}throw new Error(body.message||'本地请求失败。');}
 return binary?await response.blob():await response.json();
}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function renderRows(){
 $('proposals').replaceChildren();const rows=state.checked.rows;
 $('empty').hidden=rows.length>0;$('empty').textContent='导入的核对结果未列出修改项。这表示核对来源的结论，不是程序对语义正确性的认证。';
 $('reviewer').textContent=`核对来源（填报）：${state.checked.reviewer_claim.label}`;
 for(const row of rows){
  const card=node('article',undefined,'proposal');if(!row.ready)card.classList.add('blocked');
  const head=node('div',undefined,'proposal-header');head.append(node('span',`${row.id} · ${row.category}`,'proposal-id'));
  const label=node('label',undefined,'adopt-label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.disabled=!row.ready;
  checkbox.addEventListener('change',()=>{checkbox.checked?state.selected.add(row.id):state.selected.delete(row.id);card.classList.toggle('chosen',checkbox.checked);invalidatePlan();$('selection-count').textContent=`已选 ${state.selected.size} 项`;});
  label.append(checkbox,node('span',row.ready?'采用此项':'需重新核对'));head.append(label);card.append(head);
  const compare=node('div',undefined,'comparison');for(const [title,value,cls] of [['机翻原句',row.before,'before'],['建议替换',row.after,'after']]){const side=node('div');side.append(node('span',title,'label-mini'),node('p',value,cls));compare.append(side);}card.append(compare);
  card.append(node('div',`原稿依据：${row.source_quote}`,'quote'),node('p',row.reason,'reason'));
  if(row.context_before||row.context_after){const context=node('details');context.append(node('summary','查看定位上下文'),node('p',`${row.context_before}【${row.before}】${row.context_after}`,'reason'));card.append(context);}
  if(!row.ready)card.append(node('div',row.message,'error-note'));
  $('proposals').append(card);
 }
 $('preview').disabled=false;$('none').disabled=false;
}
async function checkAudit(){
 invalidateAudit();const version=state.revision;const data=payload();notice('正在核对版本与修改位置…');
 const result=await api('/api/review/check',data);if(version!==state.revision)return;
 state.checked=result;$('observations').textContent=result.protection_observations.map(x=>`${x.source_quote} → ${x.target_form}：${x.reason}`).join('\n')||'没有额外的AI保护内容观察。';renderRows();const blocked=result.rows.filter(r=>!r.ready).length;
 notice(`已校验 ${result.rows.length} 项，${blocked} 项需重新核对。当前未选择任何修改。${countLabel(result.count)}。`);
}
async function preview(){
 if(!state.checked)throw new Error('请先校验核对结果。');
 const version=++state.revision;state.plan=null;$('export').disabled=true;
 const data={...payload(),selected_ids:[...state.selected]};const result=await api('/api/review/preview',data);if(version!==state.revision)return;
 state.plan={...result,request:data};$('revised').textContent=result.revised;$('diff').textContent=result.diff||'无修改。新稿与输入机翻稿逐字节一致。';$('preview-area').hidden=false;
 $('preview-summary').textContent=`已选 ${result.report.selected_ids.length} 项；${countLabel(result.report.count_before)} → ${countLabel(result.report.count_after)}。程序已核对选区外字节不变。请确认建议含义后下载。`;
 $('export').disabled=false;const missing=result.report.missing_protected_terms;notice(missing.length?'注意：新稿尚未包含指定写法：'+missing.join('、')+'。未自动补写，请回到建议核对。':'预览已生成；选区外保持不变。字面检查不代替语义核对。',missing.length>0);
}
function handle(fn){return async()=>{try{await fn();}catch(error){notice(error.message,true);}};}
for(const id of ['source','draft']){
 $(id).addEventListener('input',()=>{state[id]=$(id).value;clearAudit();$(id+'-meta').textContent='使用当前编辑后的文本；请核对与之匹配的版本。';});
 $(id+'-file').addEventListener('change',handle(async()=>{const file=$(id+'-file').files[0];if(!file)return;if(file.size>200000)throw new Error('请导入200KB以内的指定章节。');const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());state[id]=raw;$(id).value=raw;clearAudit();$(id+'-meta').textContent=`已导入 ${file.name}；未编辑时保留原始换行与BOM。`;}));
}
$('audit').addEventListener('input',()=>{state.audit=$('audit').value;invalidateAudit();});
$('audit-file').addEventListener('change',handle(async()=>{const file=$('audit-file').files[0];if(!file)return;if(file.size>2000000)throw new Error('核对JSON超过2MB。');state.audit=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());$('audit').value=state.audit;$('audit-filename').textContent=file.name;invalidateAudit();notice('核对结果已导入，请点击校验。');}));
$('request').addEventListener('click',handle(async()=>{const version=state.revision;const blob=await api('/api/review/request',reviewInput(),true);if(version!==state.revision)throw new Error('输入已变化，请重新准备请求。');download(blob,'paperchoose-audit-request.zip');notice('核对请求已准备下载。是否交给外部助手由你决定。');}));
$('check').addEventListener('click',handle(checkAudit));
$('preview').addEventListener('click',handle(preview));
$('none').addEventListener('click',handle(async()=>{state.selected.clear();invalidatePlan();renderRows();$('selection-count').textContent='已选 0 项';await preview();}));
$('export').addEventListener('click',handle(async()=>{if(!state.plan)throw new Error('请先预览当前选择。');const captured=state.plan,version=state.revision;const blob=await api('/api/review/export',{...captured.request,plan_sha256:captured.plan_sha256},true);if(version!==state.revision){notice('输入或选择已变化，旧结果未下载。请重新预览。',true);return;}download(blob,'paperchoose-revision.zip');notice('结果已准备下载：新稿、差异与采用记录。原文件未被覆盖。');}));
$('example').addEventListener('click',handle(async()=>{
 if((state.source||state.draft||state.audit)&&!window.confirm('载入示例会替换当前页面内容，请先保存项目。继续吗？'))return;
 const response=await fetch('/api/example');if(!response.ok)throw new Error('无法加载示例');const ex=await response.json();
 $('direction').value='zh-en';$('protection-mode').value='auto';for(const id of ['protected-terms','author-notes','reference-original'])$(id).value='';directionLabels();
 state.source=ex.chinese;state.draft=ex.english;$('source').value=state.source;$('draft').value=state.draft;clearAudit();
 const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const context=reviewContext(),canonical=JSON.stringify(Object.fromEntries(Object.keys(context).sort().map(k=>[k,context[k]])));
 const audit={schema_version:2,mode:'translation_audit',source_sha256:await hash(state.source),draft_sha256:await hash(state.draft),context_sha256:await hash(canonical),reviewer:ex.audit.reviewer,protection_observations:[],proposals:ex.audit.proposals};
 state.audit=JSON.stringify(audit,null,2);$('audit').value=state.audit;$('audit-filename').textContent='预制合成建议（未运行AI）';await checkAudit();
}));
for(const id of ['direction','protection-mode','protected-terms','author-notes','reference-original']){
 $(id).addEventListener('input',()=>{
  if(['protected-terms','author-notes'].includes(id)&&$('protection-mode').value==='auto'&&$(id).value.trim())$('protection-mode').value='combined';
  if(id==='direction'){directionLabels();$('draft-meta').textContent='方向已变化；现有译文未被改写，请确认匹配或重新翻译。';}
  clearAudit();document.dispatchEvent(new Event('paperchoose-context'));
 });
}
$('save-project').addEventListener('click',handle(async()=>{download(new Blob([JSON.stringify({project_version:2,...reviewInput(),audit:state.audit},null,2)],{type:'application/json'}),'paperchoose-project.json');notice('已保存项目。重新打开时可恢复材料与核对清单；采用项需重新确认。');}));
$('load-project').addEventListener('change',handle(async()=>{
 const file=$('load-project').files[0];if(!file)return;if(file.size>3000000)throw new Error('项目文件超过3MB。');
 const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));
 if(p.project_version!==2||typeof p.source!=='string'||typeof p.draft!=='string'||typeof p.audit!=='string'||!p.context)throw new Error('不是v2项目文件。');
 const c=p.context;
 if(!['zh-en','en-zh'].includes(c.source_language+'-'+c.target_language)||!['auto','manual','combined'].includes(c.protection_mode)||!Array.isArray(c.protected_terms)||c.protected_terms.some(t=>typeof t!=='string')||typeof c.author_notes!=='string'||typeof c.reference_original!=='string')throw new Error('项目设置无效。');
 if((state.source||state.draft)&&!window.confirm('恢复项目会替换当前页面内容。继续吗？'))return;
 state.source=p.source;state.draft=p.draft;state.audit=p.audit;$('source').value=p.source;$('draft').value=p.draft;$('audit').value=p.audit;
 $('direction').value=c.source_language+'-'+c.target_language;$('protection-mode').value=c.protection_mode;$('protected-terms').value=c.protected_terms.join('\n');$('author-notes').value=c.author_notes;$('reference-original').value=c.reference_original;
 directionLabels();invalidateAudit();document.dispatchEvent(new Event('paperchoose-context'));notice('项目已恢复。核对建议需重新校验，采用项默认不选。');
}));
directionLabels();
(async()=>{try{const response=await fetch('/api/session');if(!response.ok)throw new Error('连接失败');const session=await response.json();state.token=session.token;$('version').textContent=session.version;notice('本地工具已就绪。你可以先试用合成示例，或导入自己的文本。');}catch{notice('无法连接本地工具。请通过启动脚本打开页面，保持终端运行。',true);}})();
