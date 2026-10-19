// State/DOM simulation, not a real-browser or translation-quality test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../paperchoose/web/translation.js'),'utf8');
function setup(){
 const nodes=new Map(),messages=[],saved=[];
 const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:false,disabled:false,handlers:{},addEventListener(k,f){this.handlers[k]=f;}});return nodes.get(id);};
 const state={token:'test',chinese:'中文原稿',english:'Old English',audit:'old audit',revision:1};
 let resolve;
 const context={state,$:el,notice:(...x)=>messages.push(x),Blob,
  download:(blob,name)=>saved.push({blob,name}),
  invalidateAudit:()=>{state.revision++;},
  window:{confirm:()=>true},handle:f=>async()=>{try{await f();}catch(e){messages.push([e.message,true]);}},
  fetch:async()=>({ok:true,json:async()=>({engine:'TEST',pairs:[{source:'zh',target:'en'},{source:'en',target:'zh'}],max_chars:5000,message:'test'})}),
  api:()=>new Promise(r=>{resolve=r;})};
 vm.runInNewContext(source,context);
 const result={translated_text:'New English',engine:{name:'TEST',version:'0',model_version:'0'}};
 return {el,state,context,messages,saved,result,finish:()=>resolve(result),click:id=>el(id).handlers.click()};
}
(async()=>{
 let h=setup();let job=h.click('translate-en');h.state.chinese='changed';h.state.revision++;h.finish();await job;
 assert.equal(h.state.english,'Old English');assert.equal(h.el('translation-result').hidden,true);
 h=setup();job=h.click('translate-en');h.finish();await job;
 assert.equal(h.state.english,'Old English'); // preview never applies automatically
 h.context.window.confirm=()=>false;await h.click('translation-use');assert.equal(h.state.english,'Old English');
 h.context.window.confirm=()=>true;await h.click('translation-use');assert.equal(h.state.english,'New English');assert.equal(h.state.audit,'');assert.equal(h.el('audit').value,'');
 await h.click('translation-save');const record=JSON.parse(await h.saved[0].blob.text());assert.equal(record.input_snapshot.english,'Old English');assert.equal(record.adopted,true);
 h=setup();job=h.click('translate-en');h.finish();await job;h.state.revision++;await h.click('translation-use');assert.equal(h.state.english,'Old English');
 console.log('PASS: stale in-flight result, preview-only, reject replacement, accept+invalidate, original snapshot export, stale preview rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
