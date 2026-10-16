import { BinaryInspector } from './inspector';
import type { Job, Result } from '../core/types';
const inspector=new BinaryInspector();
const scope=self as unknown as {onmessage:(event:MessageEvent<Job>)=>void;postMessage:(result:Result)=>void};
scope.onmessage=async(e:MessageEvent<Job>)=>{
  const {id,file,path}=e.data;
  const result:Result={id,name:file.name,path,size:file.size};
  try{result.metadata=await inspector.inspect(file);}catch(e){result.error=e instanceof Error?e.message:String(e);}
  scope.postMessage(result);
};
