import type { InspectorPort, Metadata } from '../core/types';
import { Reader, text } from './reader';
import { parseJPEG } from './parsers/jpeg';
import { parsePNG } from './parsers/png';
import { parseGIF } from './parsers/gif';
import { parseBMP } from './parsers/bmp';
import { parseTIFF } from './parsers/tiff';
import { parsePCX } from './parsers/pcx';
export class BinaryInspector implements InspectorPort {
  async inspect(file: Blob): Promise<Metadata> {
    const r=new Reader(file),v=await r.at(0,Math.min(file.size,16));
    if(v.byteLength<4)throw new Error('Файл слишком короткий');
    let result: Metadata;
    if(v.getUint16(0)===0xffd8)result=await parseJPEG(r);
    else if(v.byteLength>=8&&v.getUint32(0)===0x89504e47&&v.getUint32(4)===0x0d0a1a0a)result=await parsePNG(r);
    else if(v.byteLength>=6&&['GIF87a','GIF89a'].includes(text(v,0,6)))result=await parseGIF(r);
    else if(text(v,0,2)==='BM')result=await parseBMP(r);
    else if(['II','MM'].includes(text(v,0,2)))result=await parseTIFF(r);
    else if(v.getUint8(0)===10)result=await parsePCX(r);
    else throw new Error('Неизвестная сигнатура: поддерживаются JPG, PNG, GIF, BMP, TIF, PCX');
    if(!Number.isInteger(result.width)||!Number.isInteger(result.height)||result.width<=0||result.height<=0)throw new Error('Некорректные размеры изображения');
    result.extras['Прочитано байт']=r.bytesRead;
    return result;
  }
}
