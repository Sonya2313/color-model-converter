export type Format = 'JPEG' | 'PNG' | 'GIF' | 'BMP' | 'TIFF' | 'PCX';
export interface Metadata {
  format: Format; width: number; height: number; depth: number | null;
  dpiX: number | null; dpiY: number | null; dpiSource: string;
  compression: string; extras: Record<string, string | number>; warnings: string[];
}
export interface Result {
  id: number; name: string; path: string; size: number;
  metadata?: Metadata; error?: string;
}
export interface Job { id: number; file: File; path: string }
export interface Progress { done: number; total: number; elapsedMs: number; workers: number }
export interface InspectorPort { inspect(file: Blob): Promise<Metadata> }
export interface BatchEngine {
  run(jobs: Job[], workers: number, onBatch: (rows: Result[], progress: Progress) => void): Promise<void>;
  cancel(): void;
}
