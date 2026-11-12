import test from 'node:test';import assert from 'node:assert/strict';
import {captureTextTokens,reconstructTenantGrid} from '../src/tenant-grid.js';
const i=(str,x,y,width=50)=>({str,width,transform:[1,0,0,1,x,y]});
test('PDF.js raw token positions retained and split organization is not another person',()=>{
 const tokens=captureTextTokens([i('점유자',35,500),i('보증금',280,490),i('성명',35,485),
 i('박병만',36,465),i('414호',80,465),i('220,000,000',280,465),i('2021.12.10',390,465),
 i('주택도',35,440),i('시보증',35,430),i('권리신고',160,430),i('공사',35,420),i('<비고>',35,390)]);
 const g=reconstructTenantGrid(tokens,{sourcePage:1});
 assert.equal(g.status,'candidate-only');assert.equal(g.candidates.length,1);
 assert.equal(g.candidates[0].name,'박병만');assert.deepEqual(g.candidates[0].amountCandidates,['220,000,000']);
 assert.equal(g.candidates[0].source.sourcePage,1);assert.match(g.notice,/미확정/);
});
test('no detected header means no invented tenants',()=>{
 assert.equal(reconstructTenantGrid(captureTextTokens([i('박병만',35,465),i('220,000,000',280,465)])).candidates.length,0);
});
test('same name on two physical rows is kept separate',()=>{
 const tokens=captureTextTokens([i('점유자',35,500),i('보증금',280,490),i('성명',35,485),
 i('홍길동',36,460),i('30,000,000',280,460),i('홍길동',36,420),i('40,000,000',280,420),i('<비고>',35,390)]);
 const g=reconstructTenantGrid(tokens);assert.equal(g.candidates.length,2);
 assert.equal(g.candidates[0].amountCandidates[0],'30,000,000');
 assert.equal(g.candidates[1].amountCandidates[0],'40,000,000');
});