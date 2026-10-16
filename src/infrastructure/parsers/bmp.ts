import { Reader, positive } from '../reader';
import type { Metadata } from '../../core/types';
export async function parseBMP(r:Reader):Promise<Metadata>{
  const h=await r.at(0,26),dib=h.getUint32(14,true);
  let width:number,height:number,depth:number,code=0,x:number|null=null,y:number|null=null,colors=0,top=false;
  if(dib===12){width=h.getUint16(18,true);height=h.getUint16(20,true);depth=h.getUint16(24,true);}
  else if([40,52,56,108,124].includes(dib)){
    const v=await r.at(14,dib);width=v.getInt32(4,true);const sh=v.getInt32(8,true);height=Math.abs(sh);top=sh<0;
    if(v.getUint16(12,true)!==1) throw new Error('BMP: planes должно быть 1');
    depth=v.getUint16(14,true);code=v.getUint32(16,true);x=positive(v.getInt32(24,true)*0.0254);y=positive(v.getInt32(28,true)*0.0254);colors=v.getUint32(32,true);
  }else throw new Error(`BMP: неподдерживаемый DIB ${dib} (OS/2 2.x не поддерживается)`);
  const names:Record<number,string>={0:'Без сжатия (BI_RGB)',1:'RLE8',2:'RLE4',3:'Без сжатия, маски (BI_BITFIELDS)',4:'Встроенный JPEG',5:'Встроенный PNG',6:'Без сжатия, alpha-маски'};
  return {format:'BMP',width,height,depth:depth>0?depth:null,dpiX:x,dpiY:y,dpiSource:dib===12?'В COREHEADER нет DPI':'biXPelsPerMeter / biYPelsPerMeter × 0.0254',compression:names[code]??`Неизвестный код ${code}`,
    extras:{'Размер DIB':dib,'Порядок строк':top?'Сверху вниз':'Снизу вверх',...(depth<=8?{'Цветов в палитре':colors||2**depth}:{})},warnings:depth===32?['32 bpp не гарантирует наличие используемого alpha-канала.']:[]};
}
