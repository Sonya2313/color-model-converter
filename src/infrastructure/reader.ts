export class Reader {
  bytesRead = 0;
  private cache = new Uint8Array();
  private cacheStart = -1;
  constructor(readonly blob: Blob) {}
  async at(offset: number, length: number): Promise<DataView> {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > this.blob.size)
      throw new Error(`Файл обрезан или неверное смещение: ${offset} + ${length}`);
    if (offset >= this.cacheStart && offset + length <= this.cacheStart + this.cache.length)
      return new DataView(this.cache.buffer, this.cache.byteOffset + offset - this.cacheStart, length);
    const end = Math.min(this.blob.size, offset + Math.max(length, 16384));
    this.cache = new Uint8Array(await this.blob.slice(offset, end).arrayBuffer());
    this.cacheStart = offset; this.bytesRead += this.cache.length;
    return new DataView(this.cache.buffer, 0, length);
  }
}
export function text(v: DataView, offset: number, n: number): string {
  return String.fromCharCode(...new Uint8Array(v.buffer, v.byteOffset + offset, n));
}
export function positive(n: number): number | null { return Number.isFinite(n) && n > 0 ? n : null; }
