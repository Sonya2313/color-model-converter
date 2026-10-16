import { Reader, text, positive } from '../reader';
import { readIFD } from './tiff';
import type { Metadata } from '../../core/types';
export async function parseJPEG(r:Reader):Promise<Metadata>{
  const m:Metadata={format:'JPEG',width:0,height:0,depth:null,dpiX:null,dpiY:null,dpiSource:'JFIF / Exif: физическое разрешение не задано',compression:'JPEG',extras:{},warnings:[]};
  let pos=2,steps=0,exifX:number|null=null,exifY:number|null=null;
  const sof=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while(pos<r.blob.size){
    if(++steps>100000)throw new Error('JPEG: слишком много маркеров');
    if((await r.at(pos++,1)).getUint8(0)!==255)throw new Error('JPEG: ожидался маркер');
    let marker=(await r.at(pos++,1)).getUint8(0);
    while(marker===255){marker=(await r.at(pos++,1)).getUint8(0);}
    if(marker===0xda||marker===0xd9)break;
    if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    const len=(await r.at(pos,2)).getUint16(0);if(len<2||pos+len>r.blob.size)throw new Error('JPEG: обрезанный сегмент');
    const start=pos+2,n=len-2;
    if(sof.has(marker)){
      const d=await r.at(start,6),bits=d.getUint8(0),components=d.getUint8(5);
      m.height=d.getUint16(1);m.width=d.getUint16(3);m.depth=bits*components;
      const lossless=[0xc3,0xc7,0xcb,0xcf].includes(marker);
      m.compression=`JPEG ${lossless?'lossless (без потерь)':'DCT (с потерями)'}${[0xc2,0xc6,0xca,0xce].includes(marker)?', progressive':''}`;
      m.extras['SOF']=`0x${marker.toString(16)}`;m.extras['Бит на компонент']=bits;m.extras['Компонентов']=components;
    } else if(marker===0xe0&&n>=14){
      const d=await r.at(start,14);
      if(text(d,0,5)==='JFIF\0'){
        const unit=d.getUint8(7),factor=unit===1?1:unit===2?2.54:0;
        m.dpiX=positive(d.getUint16(8)*factor);m.dpiY=positive(d.getUint16(10)*factor);
        m.dpiSource=unit===0?'JFIF units=0: только отношение плотностей':`JFIF units=${unit}`;
      }
    } else if(marker===0xe1&&n>=14){
      if(text(await r.at(start,6),0,6)==='Exif\0\0'){
        try{const t=await readIFD(r,start+6,n-6);exifX=t.dpiX;exifY=t.dpiY;m.extras['Exif Orientation']=t.first(274,1)!;}
        catch(e){m.warnings.push(`Exif не прочитан: ${e instanceof Error?e.message:String(e)}`);}
      }
    } else if(marker===0xdb){
      let q=start,index=0;
      while(q<pos+len){const info=(await r.at(q++,1)).getUint8(0),precision=info>>4,id=info&15;
        if(precision>1)throw new Error('JPEG: неверная точность DQT');
        const d=await r.at(q,64*(precision+1));if(q+d.byteLength>pos+len)throw new Error('JPEG: обрезанная DQT');
        const values=Array.from({length:64},(_,i)=>precision?d.getUint16(i*2):d.getUint8(i));
        m.extras[`DQT ${id} (zigzag)`]=values.join(', ');q+=d.byteLength;if(++index>16)throw new Error('JPEG: слишком много DQT');
      }
    }
    pos+=len;
  }
  if(exifX!==null||exifY!==null){
    if((exifX!==null&&m.dpiX!==null&&Math.abs(exifX-m.dpiX)>0.1)||(exifY!==null&&m.dpiY!==null&&Math.abs(exifY-m.dpiY)>0.1))m.warnings.push('DPI Exif и JFIF различается: приоритет имеет Exif.');
    m.dpiX=exifX;m.dpiY=exifY;m.dpiSource='Exif IFD0: X/YResolution и ResolutionUnit';
  }
  if(!m.width||!m.height)throw new Error('JPEG: нет размера в SOF (DNL не поддерживается)');
  m.warnings.push('Глубина — точность SOF × компоненты; размер без применения Exif Orientation.');
  return m;
}
