import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { readResumeFile, validateResumeFile, MAX_FILE_BYTES } from '../lib/resume-import/file-reader.ts';
function docx(xml, filename='word/document.xml') {
 const name=Buffer.from(filename),data=Buffer.from(xml),crc=crc32(data);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
 return Buffer.concat([local,name,data,central,name,end]);
}
const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Skills</w:t></w:r></w:p><w:p><w:r><w:t>TypeScript, José, ₹</w:t></w:r></w:p></w:body></w:document>';
describe('local resume document readers',()=>{
 it('reads selectable PDF text without rewriting the source',async()=>{
  const r=await readResumeFile(readFileSync(new URL('../docs/validation/issue-282/resume.pdf',import.meta.url)),'resume.pdf');
  assert.equal(r.format,'pdf');assert.match(r.text,/Fixture Labs/);assert.equal(r.warning,'');
 });
 it('reads DOCX paragraphs and Unicode without fetching relationships',async()=>{
  const r=await readResumeFile(docx(xml),'resume.docx');assert.equal(r.text,'Skills\nTypeScript, José, ₹');
 });
 it('rejects unsupported, mismatched, empty, oversized and damaged files',async()=>{
  for(const args of [['x.txt',10,''],['x.pdf',0,''],['x.pdf',MAX_FILE_BYTES+1,''],['x.pdf',10,'text/html']])assert.throws(()=>validateResumeFile(...args));
  await assert.rejects(readResumeFile(Buffer.from('not a PDF'),'x.pdf'),/not a readable PDF/);
  await assert.rejects(readResumeFile(Buffer.from('%PDF-invalid'),'x.pdf'),/could not be read/);
  await assert.rejects(readResumeFile(docx(xml,'unrelated.xml'),'x.docx'),/does not contain/);
  await assert.rejects(readResumeFile(Buffer.from('encrypted office'),'x.docx'),/encrypted or damaged/);
 });
 it('rejects entity declarations, malformed XML, image-only and oversized document XML',async()=>{
  await assert.rejects(readResumeFile(docx('<!DOCTYPE foo [<!ENTITY secret SYSTEM "file:///etc/passwd">]>'+xml),'x.docx'),/unsupported XML/);
  await assert.rejects(readResumeFile(docx('<invalid>'),'x.docx'),/could not be read/);
  await assert.rejects(readResumeFile(docx('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>'),'x.docx'),/No readable text/);
  await assert.rejects(readResumeFile(docx('x'.repeat(4*1024*1024+1)),'x.docx'),/expands beyond/);
 });
});

it('handles real DOCX, encrypted PDF and image-only PDF fixtures', async () => {
 const fixture = name => readFileSync(new URL(`./fixtures/resume-import/${name}`, import.meta.url));
 const result = await readResumeFile(fixture('resume.docx'), 'resume.docx');
 assert.equal(result.text.trim(), fixture('resume.txt').toString().trim());
 await assert.rejects(readResumeFile(fixture('encrypted.pdf'), 'encrypted.pdf'), /password|encrypted/i);
 await assert.rejects(readResumeFile(fixture('image-only.pdf'), 'image-only.pdf'), /No readable text/);
});
