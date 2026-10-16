import { WorkerEngine } from './core/workerEngine';
// Composition root: only this file connects Engine and Infrastructure.
export const createEngine=()=>new WorkerEngine(()=>new Worker(new URL('./infrastructure/parser.worker.ts',import.meta.url),{type:'module'}));
