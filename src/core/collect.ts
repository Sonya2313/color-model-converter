import type { Job } from './types';
export async function collectJobs(files: ArrayLike<File>, onProgress?: (count:number)=>void):Promise<Job[]> {
  if(files.length>100000)throw new Error('Лимит — 100 000 файлов. Выберите папку меньшего размера.');
  const jobs:Job[]=[];
  for(let i=0;i<files.length;i++){
    const file=files[i];
    jobs.push({id:i,file,path:file.webkitRelativePath||file.name});
    if(i%2000===1999){onProgress?.(i+1);await new Promise<void>(r=>setTimeout(r,0));}
  }
  return jobs;
}
