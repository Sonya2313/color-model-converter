import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BinaryInspector} from '../src/infrastructure/inspector';
const inspector=new BinaryInspector();
const parse=async(name:string)=>inspector.inspect(new Blob([await readFile(`tests/fixtures/${name}`)]));
const close=(actual:number|null,expected:number,tol=0.03)=>assert.ok(actual!==null&&Math.abs(actual-expected)<tol,`${actual} ≈ ${expected}`);
const cases:[string,string,number,number|null,number|null][]=[
 ['rgb-300dpi.jpg','JPEG',24,300,300],['rgb-150x300.png','PNG',24,150,300],
 ['rgb-96dpi.bmp','BMP',24,96,96],['rgb.pcx','PCX',24,100,100],
 ['rgb-lzw.tif','TIFF',24,200,400],['palette.gif','GIF',2,null,null],
 ['rgba.png','PNG',32,null,null],['gray.jpg','JPEG',8,null,null],
 ['progressive.jpg','JPEG',24,240,240],['big-endian.tif','TIFF',24,144,144],
 ['bigtiff.tif','TIFF',24,110,110],['exif-vs-jfif.jpg','JPEG',24,300,150],
 ['jfif-cm.jpg','JPEG',24,254,254]
];
for(const [name,format,depth,x,y]of cases)test(name,async()=>{
 const m=await parse(name);assert.equal(m.format,format);assert.equal(m.width,37);assert.equal(m.height,23);assert.equal(m.depth,depth);
 if(x===null)assert.equal(m.dpiX,null);else close(m.dpiX,x);
 if(y===null)assert.equal(m.dpiY,null);else close(m.dpiY,y);
});
test('1-bit PNG',async()=>{const m=await parse('mono.png');assert.equal(m.depth,1);assert.equal(m.width,17);assert.equal(m.height,11);});
test('JPEG DQT extracted',async()=>assert.ok(Object.keys((await parse('rgb-300dpi.jpg')).extras).some(k=>k.startsWith('DQT'))));
test('progressive JPEG',async()=>assert.match((await parse('progressive.jpg')).compression,/progressive/));
test('TIFF LZW',async()=>assert.equal((await parse('rgb-lzw.tif')).compression,'LZW'));
test('Exif conflict is explicit',async()=>assert.ok((await parse('exif-vs-jfif.jpg')).warnings.some(w=>w.includes('различается'))));
test('extension not required',async()=>{const m=await inspector.inspect(new Blob([await readFile('tests/fixtures/rgb.pcx')]));assert.equal(m.format,'PCX');});
test('PNG reads chunks after IDAT',async()=>{
 const raw=await readFile('tests/fixtures/rgb-150x300.png');let offset=8;const chunks:Buffer[]=[];let phys:Buffer|undefined;
 while(offset<raw.length){const n=raw.readUInt32BE(offset)+12;const chunk=raw.subarray(offset,offset+n);if(chunk.toString('ascii',4,8)==='pHYs')phys=chunk;else chunks.push(chunk);offset+=n;}
 chunks.splice(chunks.length-1,0,phys!);const m=await inspector.inspect(new Blob([raw.subarray(0,8),...chunks]));close(m.dpiX,150);
});
test('unknown and truncated inputs',async()=>{
 for(const b of [new Uint8Array(),new Uint8Array([1,2,3,4,5]),(await readFile('tests/fixtures/rgb-300dpi.jpg')).subarray(0,20)])await assert.rejects(()=>inspector.inspect(new Blob([b])));
});
test('pixels are not read in large JPEG',async()=>{
 const original=await readFile('tests/fixtures/rgb-300dpi.jpg');const blob=new Blob([original,new Uint8Array(4*1024*1024)]);const m=await inspector.inspect(blob);assert.ok(Number(m.extras['Прочитано байт'])<65536);
});
test('TIFF forged offset rejected',async()=>{
 const b=Buffer.alloc(8);b.write('II');b.writeUInt16LE(42,2);b.writeUInt32LE(0xfffffff0,4);await assert.rejects(()=>inspector.inspect(new Blob([b])));
});
