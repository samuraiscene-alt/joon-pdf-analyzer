import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDocumentBatch,batchSummary} from '../src/document-batches.js';
import {findRightStatements} from '../src/rights-context.js';
import {findAuctionTerms,summarizeAuctionTerms} from '../src/keywords.js';
const sample=[
 {sourceId:'source-1',page:1,sourcePage:1,sourceFile:'one.pdf',lines:[{text:'2024타경125893 임차인 박병만'}],tables:[]},
 {sourceId:'source-2',page:2,sourcePage:1,sourceFile:'two.pdf',lines:[{text:'감정평가서, 사건번호 미기재'}],tables:[]}
];
test('multi-PDF: do not copy case number from unrelated document',()=>{
 const docs=analyzeDocumentBatch([{sourceId:'source-1',file:{name:'one.pdf'}},{sourceId:'source-2',file:{name:'two.pdf'}}],sample);
 assert.equal(docs.length,2);assert.equal(docs[0].caseNumber,'2024타경125893');assert.equal(docs[1].caseNumber,null);
 const s=batchSummary(docs);assert.equal(s.caseNumber,null);assert.deepEqual(s.unidentifiedDocuments,['two.pdf']);
});
test('duplicate names and amounts never yield a confirmed tenant count',()=>{
 const docs=analyzeDocumentBatch([{sourceId:'source-1',file:{name:'one.pdf'}}],sample);
 assert.equal(docs[0].analysis.tenantCount.value,null);
});
test('nested legal terms do not duplicate exact overlapping spans',()=>{
 const x=findAuctionTerms([{page:1,lines:[{text:'최선순위 가압류 배당요구종기 법정지상권'}]}]);
 assert.equal(x.filter(x=>x.term==='최선순위').length,1);assert.equal(x.filter(x=>x.term==='선순위').length,0);
 assert.equal(x.filter(x=>x.term==='가압류').length,1);assert.equal(x.filter(x=>x.term==='압류').length,0);
 assert.equal(x.filter(x=>x.term==='배당요구종기').length,1);assert.equal(x.filter(x=>x.term==='배당요구').length,0);
 const sum=summarizeAuctionTerms(x);assert.ok(sum.every(x=>x.mentions>=1));
});
test('bid deposit excluded from tenant security deposit mentions',()=>{
 const x=findAuctionTerms([{page:1,lines:[{text:'매수신청보증금 최저매각가격의 20%'}]}]);
 assert.equal(x.filter(h=>h.category==='임대차·점유'&&h.term==='보증금').length,0);
 assert.equal(x.filter(h=>h.term==='매수신청보증금').length,1);
});
test('waiver and registration release are quoted, not concluded',()=>{
 const pages=[{page:25,sourcePage:1,sourceId:'source-3',sourceFile:'sale.pdf',
 lines:[{text:'주택도시보증공사:임차인 박병만의 승계인으로 경매신청채권자임'},
 {text:'주택도시보증공사(양도전:임차권자 박병만)로부터 확약서가 제출됨. 대항력은'},
 {text:'포기하며, 전액을 변제받지 못하더라도 임차권등기를 말소하는 것에 동의'}]}];
 const r=findRightStatements(pages);
 assert.ok(r.some(x=>x.id==='tenant-succession'));
 assert.ok(r.some(x=>x.id==='waiver'));
 assert.ok(r.some(x=>x.id==='registration-release'));
 assert.ok(r.every(x=>/미판정/.test(x.conclusion)));
 assert.ok(r.every(x=>x.source.sourcePage===1));
});
