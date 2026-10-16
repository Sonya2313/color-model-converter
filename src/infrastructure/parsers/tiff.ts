import { Reader, text, positive } from '../reader';
import type { Metadata } from '../../core/types';
// Classic TIFF and BigTIFF, both byte orders; first IFD only.
export async function readIFD(r: Reader, base = 0, span = r.blob.size - base) {
  const get = (offset: number, size: number) => {
    if (offset < 0 || offset + size > span) throw new Error('TIFF: смещение за пределами контейнера');
    return r.at(base + offset, size);
  };
  const h = await get(0, 8), order = text(h, 0, 2);
  if (order !== 'II' && order !== 'MM') throw new Error('TIFF: неверный порядок байтов');
  const le = order === 'II', magic = h.getUint16(2, le), big = magic === 43;
  const safe = (n: bigint) => { if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('TIFF: слишком большое смещение'); return Number(n); };
  let offset: number;
  if (big) {
    if (h.getUint16(4, le) !== 8 || h.getUint16(6, le) !== 0) throw new Error('BigTIFF: неверный заголовок');
    offset = safe((await get(8, 8)).getBigUint64(0, le));
  } else {
    if (magic !== 42) throw new Error('TIFF: неверная сигнатура');
    offset = h.getUint32(4, le);
  }
  if (!offset) throw new Error('TIFF: нет IFD');
  const countSize = big ? 8 : 2, entrySize = big ? 20 : 12, inline = big ? 8 : 4;
  const c = await get(offset, countSize);
  const count = big ? safe(c.getBigUint64(0, le)) : c.getUint16(0, le);
  if (count > 65536) throw new Error('TIFF: слишком много тегов');
  const tags = new Map<number, number[]>();
  const wanted = new Set([256,257,258,259,262,274,277,282,283,296,320]);
  for (let i=0; i<count; i++) {
    const v = await get(offset + countSize + i*entrySize, entrySize);
    const tag=v.getUint16(0,le), type=v.getUint16(2,le);
    if (!wanted.has(tag)) continue;
    const n=big?safe(v.getBigUint64(4,le)):v.getUint32(4,le);
    if (n>65536) throw new Error('TIFF: слишком большой массив тегов');
    const sizes: Record<number,number>={1:1,3:2,4:4,5:8,8:2,9:4,10:8,16:8,17:8,18:8};
    const size=sizes[type]; if (!size) continue;
    const field=big?12:8;
    const d=n*size<=inline ? new DataView(v.buffer,v.byteOffset+field,n*size)
      : await get(big?safe(v.getBigUint64(field,le)):v.getUint32(field,le),n*size);
    const values:number[]=[];
    for(let j=0;j<n;j++) {
      const p=j*size;
      values.push(type===1?d.getUint8(p):type===3?d.getUint16(p,le):type===4?d.getUint32(p,le):
        type===5?d.getUint32(p,le)/d.getUint32(p+4,le):type===8?d.getInt16(p,le):
        type===9?d.getInt32(p,le):type===10?d.getInt32(p,le)/d.getInt32(p+4,le):
        type===17?Number(d.getBigInt64(p,le)):safe(d.getBigUint64(p,le)));
    }
    tags.set(tag,values);
  }
  const first=(tag:number,fallback?:number)=>tags.get(tag)?.[0]??fallback;
  const unit=first(296,2), factor=unit===2?1:unit===3?2.54:0;
  return {tags, first, big, order, dpiX:positive((first(282,0)??0)*factor), dpiY:positive((first(283,0)??0)*factor), unit};
}
export async function parseTIFF(r: Reader): Promise<Metadata> {
  const t=await readIFD(r), f=t.first;
  const samples=f(277,1)!, bits=t.tags.get(258)??[1];
  const depth=bits.length===1?bits[0]*samples:bits.reduce((a,b)=>a+b,0);
  const code=f(259,1)!;
  const names:Record<number,string>={1:'Без сжатия',2:'CCITT RLE',3:'CCITT Group 3',4:'CCITT Group 4',5:'LZW',6:'JPEG (старый TIFF)',7:'JPEG',8:'Deflate',32773:'PackBits',32946:'Deflate',34661:'JBIG',34712:'JPEG 2000',50000:'Zstandard',50001:'WebP'};
  return {format:'TIFF',width:f(256,0)!,height:f(257,0)!,depth,dpiX:t.dpiX,dpiY:t.dpiY,
    dpiSource:`IFD: X/YResolution, ResolutionUnit=${t.unit}`,compression:names[code]??`Неизвестный код ${code}`,
    extras:{'Контейнер':t.big?'BigTIFF':'Classic TIFF','Порядок байтов':t.order,'Компонентов':samples,'Бит на компонент':bits.join(', '),'PhotometricInterpretation':f(262,-1)!, 'Orientation':f(274,1)!, ...(t.tags.has(320)?{'Цветов в палитре':t.tags.get(320)!.length/3}:{})},
    warnings:['Показан первый IFD (первая страница); размеры — как записаны, без поворота по Orientation.']};
}
