import type { BatchEngine, Job, Progress, Result } from './types';
export type WorkerFactory = () => Worker;
export class WorkerEngine implements BatchEngine {
  private workers: Worker[]=[];
  private finish?:()=>void;
  constructor(private factory:WorkerFactory){}
  cancel(){ for(const w of this.workers)w.terminate();this.workers=[];this.finish?.();this.finish=undefined; }
  async run(jobs:Job[], requested:number, onBatch:(rows:Result[],p:Progress)=>void){
    this.cancel();
    const count=Math.min(Math.max(1,Math.floor(requested)),16,jobs.length);
    if(!count){onBatch([],{done:0,total:0,elapsedMs:0,workers:0});return;}
    const start=performance.now();let next=0,done=0,pending:Result[]=[];
    const flush=()=>{if(pending.length){const b=pending;pending=[];onBatch(b,{done,total:jobs.length,elapsedMs:performance.now()-start,workers:count});}};
    await new Promise<void>((resolve,reject)=>{
      const timer=setInterval(flush,100);
      const cleanup=()=>{clearInterval(timer);for(const w of this.workers)w.terminate();this.workers=[];this.finish=undefined;};
      this.finish=()=>{flush();cleanup();resolve();};
      const fail=(message:string)=>{cleanup();reject(new Error(message));};
      const assign=(w:Worker)=>{if(next<jobs.length)w.postMessage(jobs[next++]);};
      try{
        for(let i=0;i<count;i++){
          const w=this.factory();this.workers.push(w);
          w.onmessage=(e:MessageEvent<Result>)=>{pending.push(e.data);done++;if(done===jobs.length){flush();cleanup();resolve();}else assign(w);};
          w.onerror=(e)=>fail(`Ошибка worker: ${e.message||'не удалось запустить модуль'}`);
          w.onmessageerror=()=>fail('Ошибка передачи результата worker');
          assign(w);
        }
      }catch(e){fail(e instanceof Error?e.message:String(e));}
    });
  }
}
