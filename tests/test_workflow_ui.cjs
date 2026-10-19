// DOM simulation with a real Python HTTP server. Not a real-browser layout test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {spawn}=require('node:child_process'),{webcrypto,createHash}=require('node:crypto');
const root=path.join(__dirname,'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const pause=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 const server=spawn(process.env.PYTHON||'python',['-u','-c',"from paperchoose.server import LocalServer; s=LocalServer(0); print(s.server_port,flush=True); s.serve_forever()"],{cwd:root});
 try{
 const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(d.toString().trim())));server.once('error',reject);server.once('exit',c=>reject(new Error('server exited '+c)));});
 const base='http://127.0.0.1:'+port,nodes=new Map(),downloads=[];
 class El{constructor(id=''){this.id=id;this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.checked=false;this.children=[];this.handlers={};this.files=[];this.classList={toggle(){},add(){}};}addEventListener(k,f){this.handlers[k]=f;}replaceChildren(...xs){this.children=[...xs];}append(...xs){this.children.push(...xs);}click(){return this.handlers.click?.();}}
 const html=fs.readFileSync(path.join(root,'paperchoose/web/index.html'),'utf8');for(const m of html.matchAll(/id="([^"]+)"/g))nodes.set(m[1],new El(m[1]));
 const el=id=>{assert(nodes.has(id),'missing HTML id '+id);return nodes.get(id);};el('direction').value='zh-en';el('protection-mode').value='auto';
 const docEvents={};const document={getElementById:el,createElement:t=>{const n=new El();n.tag=t;return n;},addEventListener:(k,f)=>docEvents[k]=f,dispatchEvent:e=>docEvents[e.type]?.()};
 const context=vm.createContext({document,window:{confirm:()=>true},fetch:(url,opts)=>fetch(base+url,opts),Blob,TextDecoder,TextEncoder,crypto:webcrypto,Event,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout:()=>0});
 vm.runInContext(fs.readFileSync(path.join(root,'paperchoose/web/app.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(root,'paperchoose/web/translation.js'),'utf8'),context);
 for(let i=0;i<40&&!vm.runInContext('state.token',context);i++)await pause();assert(vm.runInContext('state.token',context));
 await el('example').click();assert.match(el('notice').textContent,/已校验 2 项/);
 const checkbox=el('proposals').children[0].children[0].children[1].children[0];checkbox.checked=true;checkbox.handlers.change();await el('preview').click();
 assert.match(el('revised').textContent,/may improve/);assert.match(el('revised').textContent,/The estimate is certain/);
 await el('none').click();assert.match(el('diff').textContent,/无修改/);
 // Author input, combined protection, a real en->zh review and selected output.
 el('direction').value='en-zh';el('direction').handlers.input();assert.equal(el('source-label').textContent,'英文原稿');assert.equal(el('preview').disabled,true);
 el('protected-terms').value='SFC';el('protected-terms').handlers.input();assert.equal(el('protection-mode').value,'combined');
 el('source').value='The SFC model may help.';el('source').handlers.input();el('draft').value='SFC模型一定有帮助。';el('draft').handlers.input();
 const input=vm.runInContext('reviewInput()',context),c=input.context;
 const audit={schema_version:2,mode:'translation_audit',source_sha256:sha(input.source),draft_sha256:sha(input.draft),context_sha256:sha(JSON.stringify(Object.fromEntries(Object.keys(c).sort().map(k=>[k,c[k]])))),reviewer:{kind:'synthetic',label:'UI integration fixture'},protection_observations:[],proposals:[{id:'P1-01',category:'modality',before:'一定',after:'可能',context_before:'',context_after:'',source_quote:'may help',reason:'保留可能性'}]};
 el('audit').value=JSON.stringify(audit);el('audit').handlers.input();await el('check').click();assert.equal(el('preview').disabled,false);
 const check=el('proposals').children[0].children[0].children[1].children[0];check.checked=true;check.handlers.change();await el('preview').click();assert.equal(el('revised').textContent,'SFC模型可能有帮助。');assert.equal(el('source').value,input.source);
 await el('export').click();assert.equal(downloads.at(-1).type,'application/zip');
 await el('save-project').click();const saved=await downloads.at(-1).text();assert.equal(JSON.parse(saved).context.protected_terms[0],'SFC');
 el('source').value='changed';el('source').handlers.input();assert.equal(el('export').disabled,true);
 el('load-project').files=[{size:saved.length,arrayBuffer:async()=>new TextEncoder().encode(saved).buffer}];await el('load-project').handlers.change();assert.equal(el('source').value,input.source);assert.equal(vm.runInContext('state.selected.size',context),0);assert.equal(el('preview').disabled,true);
 // A new constraint invalidates the previous review at the server too.
 el('author-notes').value='New constraint';el('author-notes').handlers.input();el('audit').value=JSON.stringify(audit);el('audit').handlers.input();await el('check').click();assert.match(el('notice').textContent,/已变化/);assert.equal(el('preview').disabled,true);
 console.log('PASS: real HTTP with simulated DOM: example, one-only, none, direction, mixed protection, en->zh review/export, source preservation, save/restore, changed constraints rejection');
 }finally{server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
