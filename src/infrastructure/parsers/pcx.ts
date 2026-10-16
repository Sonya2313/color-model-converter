import { Reader, positive } from '../reader';
import type { Metadata } from '../../core/types';
export async function parsePCX(r:Reader):Promise<Metadata>{
  const v=await r.at(0,128),bits=v.getUint8(3),planes=v.getUint8(65),code=v.getUint8(2);
  if(![1,2,4,8].includes(bits)||planes<1||planes>4)throw new Error('PCX: неверная глубина / число плоскостей');
  const depth=bits*planes;
  let palette=depth<=4?2**depth:0;
  if(depth===8&&planes===1&&r.blob.size>=897){if((await r.at(r.blob.size-769,1)).getUint8(0)===12)palette=256;}
  return {format:'PCX',width:v.getUint16(8,true)-v.getUint16(4,true)+1,height:v.getUint16(10,true)-v.getUint16(6,true)+1,depth,
    dpiX:positive(v.getUint16(12,true)),dpiY:positive(v.getUint16(14,true)),dpiSource:'HRes / VRes в заголовке (иногда записаны неточно)',
    compression:code===1?'RLE':code===0?'Без сжатия':`Неизвестный код ${code}`,
    extras:{'Версия':v.getUint8(1),'Бит на плоскость':bits,'Плоскостей':planes,'Байт в строке плоскости':v.getUint16(66,true),...(palette?{'Цветов в палитре':palette}:{})},warnings:['DPI берётся из заголовка PCX; некоторые программы записывают туда размеры вместо физического разрешения.']};
}
