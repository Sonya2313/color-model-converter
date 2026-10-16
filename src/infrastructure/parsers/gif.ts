import { Reader, text } from '../reader';
import type { Metadata } from '../../core/types';
export async function parseGIF(r:Reader):Promise<Metadata>{
  const h=await r.at(0,13),packed=h.getUint8(10),global=!!(packed&128),gbits=(packed&7)+1;
  const m:Metadata={format:'GIF',width:h.getUint16(6,true),height:h.getUint16(8,true),depth:global?gbits:null,
    dpiX:null,dpiY:null,dpiSource:'Формат GIF не хранит физический DPI',compression:'LZW (без потерь)',
    extras:{'Версия':text(h,0,6),'Исходная color resolution, бит/канал':((packed>>4)&7)+1,...(global?{'Цветов глобальной палитры':2**gbits}:{})},warnings:['Размер — логический холст. Глубина — индекс палитры первого кадра; другие кадры могут иметь свои палитры.']};
  if(h.getUint8(12)) m.extras['Pixel aspect ratio']=(h.getUint8(12)+15)/64;
  let pos=13+(global?3*2**gbits:0),steps=0;
  const skipBlocks=async()=>{while(true){if(++steps>100000)throw new Error('GIF: слишком много подблоков');const n=(await r.at(pos,1)).getUint8(0);pos++;if(!n)break;pos+=n;if(pos>r.blob.size)throw new Error('GIF: обрезанный подблок');}};
  while(pos<r.blob.size){
    if(++steps>100000)throw new Error('GIF: слишком много блоков');
    const code=(await r.at(pos++,1)).getUint8(0);
    if(code===0x2c){const d=await r.at(pos,9),p=d.getUint8(8),local=!!(p&128),b=(p&7)+1;
      if(local)m.depth=b;
      if(m.depth===null)throw new Error('GIF: у первого кадра нет палитры');
      m.extras['Размер первого кадра']=`${d.getUint16(4,true)} × ${d.getUint16(6,true)}`;
      m.extras['Палитра первого кадра']=local?'Локальная':'Глобальная';m.extras['Цветов палитры первого кадра']=2**m.depth;
      return m;
    }
    if(code===0x21){await r.at(pos,1);pos++;await skipBlocks();}
    else if(code===0x3b)break;
    else throw new Error(`GIF: неизвестный блок 0x${code.toString(16)}`);
  }
  throw new Error('GIF: не найден первый кадр');
}
