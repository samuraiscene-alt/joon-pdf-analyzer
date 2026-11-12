import test from 'node:test';import assert from 'node:assert/strict';import {analyzePages,itemsToLines} from '../src/analyzer.js';
test('does not invent tenant count for plain text-only PDF',()=>{
 const x=analyzePages([{page:1,lines:[{text:'2023타경5787'},{text:'김광순 35,000,000 송상규 30,000,000 이범희 임동영'}]}]);
 assert.equal(x.caseNumber,'2023타경5787');assert.equal(x.tenantCount.value,null);assert.equal(x.tenants.length,0);
});
test('table header yields independent records',()=>{
 const x=analyzePages([{page:1,lines:[],tables:[{id:'t1',headers:['성명','보증금','전입신고일자','배당요구일자'],rows:[['김광순','35,000,000','2000.03.17.','2024.2.2.'],['송상규','30,000,000','2010.05.03.','2024.2.2.'],['이범희','','2008.01.18',''],['임동영','','2006.10.23','']]}]}]);
 assert.equal(x.tenantCount.minObserved,4);assert.equal(x.tenants.length,4);
});
test('duplicate names require manual validation',()=>{
 const x=analyzePages([{page:1,lines:[],tables:[{headers:['성명'],rows:[['홍길동'],['홍길동']]}]}]);
 assert.equal(x.tenantCount.value,null);assert.ok(x.unresolved.some(r=>/동명이인/.test(r.reason)));
});
test('empty name rows are unresolved and not counted as new tenants',()=>{
 const x=analyzePages([{page:1,lines:[],tables:[{headers:['성명'],rows:[['홍길동'],['']]}]}]);
 assert.equal(x.tenantCount.value,null);assert.equal(x.tenantCount.minObserved,1);
});
test('coordinate sorting reconstructs visual lines',()=>{
 const r=itemsToLines([{str:'아래',transform:[1,0,0,1,0,10],width:18},{str:'위',transform:[1,0,0,1,0,30],width:18}]);
 assert.deepEqual(r.map(x=>x.text),['위','아래']);
});
