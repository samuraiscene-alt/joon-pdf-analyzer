import test from 'node:test';
import assert from 'node:assert/strict';
import {findTenantCandidates,textQuality} from '../src/tenant-candidates.js';
test('broken table: real name candidate, no corporate fragment counted as person',()=>{
 const p=[{page:2,sourcePage:1,sourceFile:'example.pdf',lines:[
 {text:'점유자 점유 정보출처 점유의 임대차기간'},
 {text:'박병만 414호 임차권 2021.12.10 220,000,000 2021.12.10 2021.11.18'},
 {text:'주택도'},{text:'주거'},
 {text:'시보증 414호 권리신고 2021.12.10 220,000,000 2021.12.10 2021.11.18 2025.2.25.'},
 {text:'<비고>'},{text:'주택도시보증공사:임차인 박병만의 승계인'}
 ]}];
 const candidates=findTenantCandidates(p);
 assert.equal(candidates.length,1);
 assert.equal(candidates[0].name,'박병만');
 assert.deepEqual(candidates[0].amountCandidates,['220,000,000']);
 assert.equal(candidates[0].source.sourcePage,1);
 assert.match(candidates[0].status,/후보/);
});
test('generic appraisal money is not a tenant',()=>{
 const p=[{page:1,lines:[{text:'감정평가액 233,000,000'},{text:'김길동 300,000,000'}]}];
 assert.deepEqual(findTenantCandidates(p),[]);
});
test('malformed PDF Unicode triggers OCR fallback',()=>{
 const r=textQuality([{text:'쩣풞 컪풆훟팧힎짷쩣풞 졓옇\ue45a\ud9f6 \ue45a\ue3d2\ue437'}]);
 assert.equal(r.needsOCR,true);
});
test('ordinary Korean lines use PDF text',()=>assert.equal(textQuality([{text:'서울중앙지방법원 매각물건명세서'}]).needsOCR,false));
