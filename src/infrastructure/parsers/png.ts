import { Reader, text, positive } from '../reader';
import type { Metadata } from '../../core/types';
export async function parsePNG(r:Reader):Promise<Metadata> {
  const h=await r.at(8,25);
  if(text(h,4,4)!=='IHDR'||h.getUint32(0)!==13) throw new Error('PNG: нет корректного IHDR');
  const width=h.getUint32(8),height=h.getUint32(12),bits=h.getUint8(16),type=h.getUint8(17);
  const channels:Record<number,number>={0:1,2:3,3:1,4:2,6:4};
  const allowed:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
  if(!allowed[type]?.includes(bits)) throw new Error('PNG: неверные цветовой тип / глубина');
  const m:Metadata={format:'PNG',width,height,depth:bits*channels[type],dpiX:null,dpiY:null,dpiSource:'pHYs отсутствует',compression:h.getUint8(18)===0?'Deflate (без потерь)':`Неизвестный код ${h.getUint8(18)}`,
    extras:{'Цветовой тип':type,'Бит на компонент / индекс':bits,'Компонентов':channels[type],'Чересстрочность':h.getUint8(20)?'Adam7':'Нет'},warnings:[]};
  let offset=33, steps=0;
  while(offset+12<=r.blob.size){
    if(++steps>100000) throw new Error('PNG: слишком много chunks');
    const c=await r.at(offset,8),len=c.getUint32(0),name=text(c,4,4);
    if(offset+len+12>r.blob.size) throw new Error('PNG: обрезанный chunk');
    if(name==='pHYs'){
      if(len!==9) throw new Error('PNG: неверная длина pHYs');
      const d=await r.at(offset+8,9),unit=d.getUint8(8);
      if(unit===1){m.dpiX=positive(d.getUint32(0)*0.0254);m.dpiY=positive(d.getUint32(4)*0.0254);m.dpiSource='pHYs: px/m × 0.0254';}
      else {m.dpiSource='pHYs: только соотношение сторон';m.extras['Отношение плотностей']=`${d.getUint32(0)}:${d.getUint32(4)}`;}
    }
    if(name==='PLTE') m.extras['Цветов в палитре']=len/3;
    if(name==='tRNS') m.extras['Прозрачность']='tRNS (не дополнительный канал в глубине)';
    if(name==='IEND') break;
    offset+=len+12;
  }
  m.warnings.push('CRC и сжатые пиксели не проверяются; индексная глубина — биты индекса, не 24-битная палитра.');
  return m;
}
