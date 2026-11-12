import test from 'node:test';import assert from 'node:assert/strict';
import {assignFileIds,pagesForSource,sha256Blob} from '../src/file-identity.js';
test('same-name uploads never share extracted pages',()=>{
 const selected=assignFileIds([{name:'경매.pdf'},{name:'경매.pdf'}]);
 assert.notEqual(selected[0].sourceId,selected[1].sourceId);
 const pages=[{sourceId:selected[0].sourceId,text:'A'},{sourceId:selected[1].sourceId,text:'B'}];
 assert.deepEqual(pagesForSource(pages,selected[0].sourceId).map(p=>p.text),['A']);
});
test('SHA256 source hash stable for same bytes',async()=>{
 const bytes=new Blob(['court-document']);
 const first=await sha256Blob(bytes);assert.equal(first.length,64);assert.equal(first,await sha256Blob(bytes));
});
