import test from 'node:test';import assert from 'node:assert/strict';
import {createTenantReview,makeAuctionHandoff} from '../src/tenant-review.js';
import {analyzePages} from '../src/analyzer.js';
test('identical names are only review candidates, not auto-merged',()=>{
 const g=createTenantReview([{name:'송상규',deposit:'30,000,000',source:{page:1,row:1}},{name:'송상규',deposit:'30,000,000',source:{page:2,row:3}}]);
 assert.equal(g.length,1);assert.equal(g[0].recordCount,2);assert.equal(g[0].isMerged,false);assert.match(g[0].identityStatus,/확인 필요/);assert.equal(g[0].evidence.length,2);
});
test('conflicting amounts preserved as two values',()=>{
 const g=createTenantReview([{name:'홍길동',deposit:'30,000,000'},{name:'홍길동',deposit:'50,000,000'}]);
 assert.deepEqual(g[0].conflicts,['deposit']);assert.equal(g[0].fields.deposit.values.length,2);
});
test('missing and present values do not count as conflicting',()=>{
 const g=createTenantReview([{name:'홍길동',moveIn:''},{name:'홍길동',moveIn:'2010.05.03'}]);
 assert.deepEqual(g[0].conflicts,[]);assert.equal(g[0].fields.moveIn.status,'원문 기재');
});
test('handoff is preview-only without automatic overwrite or invented assumed amount',()=>{
 const analysis=analyzePages([{page:1,lines:[],tables:[{headers:['성명','보증금','전입신고일자'],verified:false,rows:[['김광순','35,000,000','2000.03.17'],['송상규','30,000,000','2010.05.03'],['이범희','','2008.01.18'],['임동영','','2006.10.23']]}]}]);
 const handoff=makeAuctionHandoff(analysis,{sourceHash:'abc'});
 assert.equal(handoff.sections.tenants.entries.length,4);assert.equal(handoff.sections.possibleAssumedAmount.value,null);assert.equal(handoff.importPolicy.automaticOverwrite,false);assert.equal(handoff.case.identityVerified,false);assert.equal(handoff.document.sha256,'abc');
});
test('different names produce separate review groups',()=>{
 const groups=createTenantReview([{name:'김광순'},{name:'송상규'},{name:'이범희'},{name:'임동영'}]);assert.equal(groups.length,4);
});
