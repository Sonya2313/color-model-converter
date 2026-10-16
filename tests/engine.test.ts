import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkerEngine} from '../src/core/workerEngine';
import {collectJobs} from '../src/core/collect';
import type {Job,Result} from '../src/core/types';
class FakeWorker {
 onmessage:((e:{data:Result})=>void)|null=null;
 onerror:((e:{message:string})=>void)|null=null;
 onmessageerror:(()=>void)|null=null;
 dead=false;
 constructor(private mode='ok'){}
 postMessage(job:Job){setTimeout(()=>{
  if(this.dead)return;
  if(this.mode==='fail'){this.onerror?.({message:'test failure'});return;}
  this.onmessage?.({data:{id:job.id,name:job.file.name,path:job.path,size:job.file.size,error:'fixture error'}});
 },1);}
 terminate(){this.dead=true;}
}
const makeJobs=(n:number)=>Array.from({length:n},(_,id)=>({id,file:{name:`${id}.png`,size:10} as File,path:`folder/${id}.png`}));
test('engine handles empty input',async()=>{let total=-1;await new WorkerEngine(()=>new FakeWorker() as unknown as Worker).run([],4,(_,p)=>total=p.total);assert.equal(total,0);});
test('engine returns every job once',async()=>{
 const rows:Result[]=[];let done=0;const workers:FakeWorker[]=[];
 const e=new WorkerEngine(()=>{const w=new FakeWorker();workers.push(w);return w as unknown as Worker;});
 await e.run(makeJobs(53),4,(batch,p)=>{rows.push(...batch);done=p.done;});
 assert.equal(rows.length,53);assert.equal(new Set(rows.map(r=>r.id)).size,53);assert.equal(done,53);assert.ok(workers.every(w=>w.dead));
});
test('workers limited to job count',async()=>{let count=0;await new WorkerEngine(()=>{count++;return new FakeWorker() as unknown as Worker;}).run(makeJobs(2),16,()=>{});assert.equal(count,2);});
test('worker error rejects run',async()=>{await assert.rejects(()=>new WorkerEngine(()=>new FakeWorker('fail') as unknown as Worker).run(makeJobs(2),2,()=>{}),/test failure/);});
test('cancel resolves and terminates workers',async()=>{const all:FakeWorker[]=[];const e=new WorkerEngine(()=>{const w=new FakeWorker();all.push(w);return w as unknown as Worker;});const p=e.run(makeJobs(100),2,()=>{});e.cancel();await p;assert.ok(all.every(w=>w.dead));});
test('collect keeps relative path',async()=>{const a=await collectJobs([{name:'x.png',webkitRelativePath:'folder/x.png'} as File]);assert.equal(a[0].path,'folder/x.png');assert.equal(a[0].id,0);});
test('collect falls back to filename',async()=>{const a=await collectJobs([{name:'x.png',webkitRelativePath:''} as File]);assert.equal(a[0].path,'x.png');});
test('collect rejects over 100000',async()=>{await assert.rejects(()=>collectJobs({length:100001} as ArrayLike<File>),/100 000/);});
