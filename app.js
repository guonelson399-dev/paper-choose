'use strict';
const $=id=>document.getElementById(id);
const state={token:null,chinese:'',english:'',audit:'',checked:null,selected:new Set(),plan:null,revision:0};
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function invalidatePlan(){state.revision++;state.plan=null;$('export').disabled=true;$('preview-area').hidden=true;$('preview-summary').textContent='下载包含新英文稿、前后差异和采用记录。已有文件保持原样。';}
function invalidateAudit(){invalidatePlan();state.checked=null;state.selected.clear();$('proposals').replaceChildren();$('empty').hidden=false;$('empty').textContent='请校验当前输入对应的核对结果。';$('preview').disabled=true;$('none').disabled=true;$('selection-count').textContent='已选 0 项';$('reviewer').textContent='核对由你选用的助手或人工提供';}
function payload(){return {chinese:state.chinese,english:state.english,audit:state.audit};}
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
  const compare=node('div',undefined,'comparison');for(const [title,value,cls] of [['原英文',row.before,'before'],['建议替换',row.after,'after']]){const side=node('div');side.append(node('span',title,'label-mini'),node('p',value,cls));compare.append(side);}card.append(compare);
  card.append(node('div',`中文依据：${row.source_quote}`,'quote'),node('p',row.reason,'reason'));
  if(row.context_before||row.context_after){const context=node('details');context.append(node('summary','查看定位上下文'),node('p',`${row.context_before}【${row.before}】${row.context_after}`,'reason'));card.append(context);}
  if(!row.ready)card.append(node('div',row.message,'error-note'));
  $('proposals').append(card);
 }
 $('preview').disabled=false;$('none').disabled=false;
}
async function checkAudit(){
 invalidateAudit();const version=state.revision;const data=payload();notice('正在核对版本与修改位置…');
 const result=await api('/api/check',data);if(version!==state.revision)return;
 state.checked=result;renderRows();const blocked=result.rows.filter(r=>!r.ready).length;
 notice(`已校验 ${result.rows.length} 项，${blocked} 项需重新核对。当前未选择任何修改。英文工作流词数 ${result.count.words}。`);
}
async function preview(){
 if(!state.checked)throw new Error('请先校验核对结果。');
 const version=++state.revision;state.plan=null;$('export').disabled=true;
 const data={...payload(),selected_ids:[...state.selected]};const result=await api('/api/preview',data);if(version!==state.revision)return;
 state.plan={...result,request:data};$('revised').textContent=result.revised;$('diff').textContent=result.diff||'无修改。新稿与输入英文逐字节一致。';$('preview-area').hidden=false;
 $('preview-summary').textContent=`已选 ${result.report.selected_ids.length} 项；工作流词数 ${result.report.count_before.words} → ${result.report.count_after.words}。程序已核对选区外字节不变。请确认建议含义后下载。`;
 $('export').disabled=false;notice('预览已生成；尚未写入任何原稿。');
}
function handle(fn){return async()=>{try{await fn();}catch(error){notice(error.message,true);}};}
for(const id of ['chinese','english']){
 $(id).addEventListener('input',()=>{state[id]=$(id).value;invalidateAudit();$(id+'-meta').textContent='使用当前编辑后的文本；请核对与之匹配的版本。';});
 $(id+'-file').addEventListener('change',handle(async()=>{const file=$(id+'-file').files[0];if(!file)return;if(file.size>200000)throw new Error('请导入200KB以内的指定章节。');const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());state[id]=raw;$(id).value=raw;invalidateAudit();$(id+'-meta').textContent=`已导入 ${file.name}；未编辑时保留原始换行与BOM。`;}));
}
$('audit').addEventListener('input',()=>{state.audit=$('audit').value;invalidateAudit();});
$('audit-file').addEventListener('change',handle(async()=>{const file=$('audit-file').files[0];if(!file)return;if(file.size>2000000)throw new Error('核对JSON超过2MB。');state.audit=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());$('audit').value=state.audit;$('audit-filename').textContent=file.name;invalidateAudit();notice('核对结果已导入，请点击校验。');}));
$('request').addEventListener('click',handle(async()=>{const blob=await api('/api/request',{chinese:state.chinese,english:state.english},true);download(blob,'paperchoose-audit-request.zip');notice('核对请求已准备下载。是否交给外部助手由你决定。');}));
$('check').addEventListener('click',handle(checkAudit));
$('preview').addEventListener('click',handle(preview));
$('none').addEventListener('click',handle(async()=>{state.selected.clear();invalidatePlan();renderRows();$('selection-count').textContent='已选 0 项';await preview();}));
$('export').addEventListener('click',handle(async()=>{if(!state.plan)throw new Error('请先预览当前选择。');const captured=state.plan,version=state.revision;const blob=await api('/api/export',{...captured.request,plan_sha256:captured.plan_sha256},true);if(version!==state.revision){notice('输入或选择已变化，旧结果未下载。请重新预览。',true);return;}download(blob,'paperchoose-revision.zip');notice('结果已准备下载：新稿、差异与采用记录。原文件未被覆盖。');}));
$('example').addEventListener('click',handle(async()=>{if((state.chinese||state.english||state.audit)&&!window.confirm('载入合成示例会替换页面中尚未下载的会话内容。继续吗？'))return;const response=await fetch('/api/example');if(!response.ok)throw new Error('合成示例无法加载。');const ex=await response.json();state.chinese=ex.chinese;state.english=ex.english;state.audit=JSON.stringify(ex.audit,null,2);$('chinese').value=state.chinese;$('english').value=state.english;$('audit').value=state.audit;$('audit-filename').textContent='合成示例 audit.v1.json';$('chinese-meta').textContent='合成中文原稿';$('english-meta').textContent='手工设计的合成英文，不是实际论文';await checkAudit();}));
(async()=>{try{const response=await fetch('/api/session');if(!response.ok)throw new Error('连接失败');const session=await response.json();state.token=session.token;$('version').textContent=session.version;notice('本地工具已就绪。你可以先试用合成示例，或导入自己的文本。');}catch{notice('无法连接本地工具。请通过启动脚本打开页面，保持终端运行。',true);}})();
