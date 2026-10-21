// Real React components + real Python HTTP executor in jsdom; cloud AI/Argos
// responses are explicit fixtures. This is not a cloud model quality test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { JSDOM, VirtualConsole } from 'jsdom';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const repo = path.resolve(root, '..');
const port = 18876;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.env.PYTHON || 'python', ['-B', '-m', 'paperchoose', 'serve', '--port', String(port)], {cwd:repo, stdio:['ignore','pipe','pipe']});
let dom;
try {
  await once(server.stdout, 'data');
  const mock = 'virtual:pc-test-client';
  const result = await build({configFile:false, root, logLevel:'error',
    plugins:[{name:'pc-fixtures',resolveId(id){if(id==='@/api/base44Client') return mock;},load(id){if(id===mock)return 'export const base44 = { functions: { invoke: (...args) => window.pcAI(...args) }, app: {}, auth: {} };';}},react()],
    resolve:{alias:[{find:'@/api/base44Client',replacement:'@/api/base44Client'},{find:'@',replacement:path.join(root,'src')}]},
    define:{'import.meta.env.VITE_PC_LOCAL':JSON.stringify('1'), 'process.env.NODE_ENV':JSON.stringify('production')},
    build:{write:false, lib:{entry:path.join(root,'src/main.jsx'),name:'PCTest',formats:['iife']},minify:false}});
  const code=(Array.isArray(result) ? result[0] : result).output.find(x=>x.type==='chunk').code;
  const errors=[]; const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  dom=new JSDOM('<div id="root"></div>',{url:base,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}};
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  let cloudCalls=0, cloudResult=null, downloaded=null, translatePending=null, failTranslation=false, translateCalls=0;
  w.URL.createObjectURL=(blob)=>{downloaded=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  const fixture={reviewer:{kind:'assistant',label:'Synthetic test fixture, not live AI'},protection_observations:[],proposals:[
    {id:'P1-01',category:'number',before:'84',after:'48',context_before:'',context_after:'',source_quote:'48 households',reason:'数字与原稿不符'},
    {id:'P1-02',category:'negation',before:'proves causation',after:'does not prove causation',context_before:'',context_after:'',source_quote:'does not prove causation',reason:'否定遗漏'},
  ]};
  w.pcAI=async(name, body)=>{cloudCalls++;assert.equal(name,'checkTranslation');assert.equal(body.context.source_language,'en');assert.equal(body.context.pivot_language,'zh');assert.equal(body.context.target_language,'en');assert.ok(body.source && body.pivot && body.draft);return {data:cloudResult ?? fixture};};
  w.fetch=async(url,opts)=>{
    if(url.endsWith('/api/translation/status'))return new Response(JSON.stringify({pairs:[{source:'zh',target:'en'}],max_chars:5000,message:'Test fixture model'}));
    if(url.endsWith('/api/translate')){
      translateCalls++;
      if(failTranslation){failTranslation=false;return new Response(JSON.stringify({error:'TEST',message:'synthetic failure'}),{status:422});}
      const request=JSON.parse(opts.body);assert.equal(request.source,'zh');assert.equal(request.target,'en');assert.ok(request.text.length<=5000);const text=request.text;
      if(translatePending)await translatePending;
      return new Response(JSON.stringify({translated_text:text,engine:{name:'TEST',version:'0',model_version:'0'}}));
    }
    return fetch(url,opts);
  };
  w.eval(code);
  const wait=async(fn,msg)=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw new Error('Timeout: '+msg);};
  const button=(text)=>[...w.document.querySelectorAll('button')].find(x=>x.textContent.includes(text));
  const click=async(text)=>{const b=button(text);assert.ok(b,'button '+text);assert.equal(b.disabled,false,'enabled '+text);b.click();await new Promise(r=>setTimeout(r,30));};
  const input=(el,value)=>{Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  await wait(()=>button('本机已连接'),'local connection');
  await click('载入一份演示稿');
  input(w.document.querySelectorAll('textarea')[2], '😀 ' + w.document.querySelectorAll('textarea')[2].value);
  await new Promise(r=>setTimeout(r,30));await click('下一步');
  assert.equal(cloudCalls,0,'no cloud call before consent');
  const checks=[...w.document.querySelectorAll('[role="checkbox"]')];for(const c of checks){c.click();await new Promise(r=>setTimeout(r,30));}
  await click('开始核对');await wait(()=>button('全部不采用，去导出')&&!button('全部不采用，去导出').disabled,'initial preview');
  assert.equal(cloudCalls,1);
  await click('全部不采用，去导出');await click('下载结果包');
  await wait(()=>downloaded,'none ZIP');
  const fs=await import('node:fs/promises');const os=await import('node:os');const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'pc-web-'));
  await fs.writeFile(path.join(tmp,'none.zip'),Buffer.from(await downloaded.arrayBuffer()));
  await click('回去调整选择');w.document.querySelector('[data-proposal="P1-01"]').click();
  await wait(()=>button('采用 1 项，去导出')&&!button('采用 1 项，去导出').disabled,'selected preview');
  assert.equal(w.document.querySelector('mark').textContent,'48','Unicode-safe preview offset');
  await click('采用 1 项，去导出');downloaded=null;await click('下载结果包');await wait(()=>downloaded,'one ZIP');
  await fs.writeFile(path.join(tmp,'one.zip'),Buffer.from(await downloaded.arrayBuffer()));
  const verify=spawn(process.env.PYTHON||'python',['-c',`import zipfile,sys\na=zipfile.ZipFile(sys.argv[1]);b=zipfile.ZipFile(sys.argv[2]);assert a.read('revised.en.txt')==a.read('machine.argos.en.txt');assert b.read('revised.en.txt').decode()==b.read('machine.argos.en.txt').decode().replace('84','48',1);assert a.testzip() is None and b.testzip() is None;assert all(a.read(n)==b.read(n) for n in ['source.en.txt','pivot.zh.txt','machine.argos.en.txt']);assert a.read('machine.argos.en.txt').decode().startswith('😀 ');print('ZIP exact-selection checks passed')`,path.join(tmp,'none.zip'),path.join(tmp,'one.zip')],{stdio:'inherit'});
  assert.equal((await once(verify,'exit'))[0],0);
  await click('回去调整选择');await click('返回稿件');
  input(w.document.querySelector('textarea'),'Changed original.');await new Promise(r=>setTimeout(r,40));
  assert.ok(w.document.body.textContent.includes('之前的建议和选择已失效'));
  await click('用本机 Argos 翻译');
  const chinese='第一句。第二句。'.repeat(1400)+'\n\n';
  input(w.document.querySelectorAll('textarea')[1],chinese);await new Promise(r=>setTimeout(r,30));
  let release;translatePending=new Promise(r=>release=r);
  await click('中文 → 英文 开始翻译');await wait(()=>translateCalls>0,'pending translation');
  input(w.document.querySelectorAll('textarea')[1],'新的中文中间稿。');await new Promise(r=>setTimeout(r,25));release();translatePending=null;
  await wait(()=>w.document.body.textContent.includes('旧翻译已停止'),'stale translation stopped');
  assert.equal(w.document.querySelectorAll('textarea')[2].value,'');
  input(w.document.querySelectorAll('textarea')[1],chinese);await new Promise(r=>setTimeout(r,25));
  failTranslation=true;await click(button('从头重新翻译') ? '从头重新翻译' : '中文 → 英文 开始翻译');await wait(()=>w.document.body.textContent.includes('翻译失败'),'failure retained');
  await click('继续翻译');await wait(()=>w.document.querySelectorAll('textarea')[2].value===chinese,'resume and exact merge');
  assert.ok(translateCalls>=4);
  assert.equal(button('下一步').disabled,false,'long translation can advance');
  await click('下一步');assert.equal(w.document.querySelectorAll('[role="checkbox"][data-state="checked"]').length,0,'input change clears consent');
  // Malformed cloud responses must fail visibly; only a valid empty list is success.
  const malformed=[{}, {reviewer:fixture.reviewer,protection_observations:[]},
    {...fixture,proposals:[{}]}, {...fixture,protection_observations:[{source_quote:'Changed original.'}]}];
  // Use the short three-input fixture again; long batches above only test transport.
  await click('返回稿件');
  await click('载入一份演示稿');await click('下一步');
  for(const c of w.document.querySelectorAll('[role="checkbox"]')){c.click();await new Promise(r=>setTimeout(r,30));}
  for(const bad of malformed){
    cloudResult=bad;const before=cloudCalls;await click('开始核对');
    await wait(()=>cloudCalls===before+1 && !button('开始核对').disabled,'malformed response settled');
    assert.ok(w.document.body.textContent.includes('失败') || w.document.body.textContent.includes('必须') || w.document.body.textContent.includes('缺少'),w.document.body.textContent);
    assert.equal(button('全部不采用，去导出'),undefined,'malformed response must not become empty success');
    assert.ok(!w.document.body.textContent.includes('没有发现需要修改的地方'));
  }
  cloudResult={reviewer:fixture.reviewer,proposals:[],protection_observations:[]};
  await click('开始核对');await wait(()=>button('全部不采用，去导出')&&!button('全部不采用，去导出').disabled,'valid empty list');
  assert.ok(w.document.body.textContent.includes('没有发现需要修改的地方'));
  console.log('PASS: real React / Python HTTP: consent, selected + none ZIP, stale audit, stale translation, batch retry, >5000 input.');
  assert.equal(errors.length,0,errors.join('\n'));
} finally {if(dom)dom.window.close();server.kill();}
