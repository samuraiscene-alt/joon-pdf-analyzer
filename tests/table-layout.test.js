import test from 'node:test';import assert from 'node:assert/strict';
import {reconstructTableCandidates} from '../src/table-layout.js';
import {analyzePages} from '../src/analyzer.js';
const g=(str,x,y,w=28)=>({str,width:w,transform:[1,0,0,1,x,y]});
test('separate aligned tenant records from distinct columns',()=>{
 const items=[g('성명',0,100),g('보증금',100,100),g('전입신고일자',220,100),g('확정일자',350,100),g('배당요구일자',470,100),g('김광순',0,80),g('35,000,000',100,80),g('2000.03.17',220,80),g('2008.10.24',350,80),g('2024.2.2',470,80),g('송상규',0,60),g('30,000,000',100,60),g('2010.05.03',220,60),g('2010.05.03',350,60),g('2024.2.2',470,60)];
 const tables=reconstructTableCandidates(items,1);assert.equal(tables.length,1);assert.equal(tables[0].rows.length,2);assert.equal(tables[0].verified,false);const a=analyzePages([{page:1,lines:[],tables}]);assert.equal(a.tenants.length,2);assert.equal(a.tenantCount.minObserved,2);
});
test('never claim a reconstructed table is verified',()=>{const tables=reconstructTableCandidates([g('성명',0,100),g('보증금',100,100),g('확정일자',220,100),g('김광순',0,80),g('5000',100,80)],1);assert.equal(tables[0].verified,false);});
test('do not reconstruct table from unaligned text',()=>{assert.deepEqual(reconstructTableCandidates([g('김광순 임차인 보증금 35,000,000',0,100)],1),[]);});
test('split-line headers can identify four people without claiming verification',()=>{
 const items=[g('성',0,140),g('보',100,140),g('전입신고',220,140),g('확정',350,140),g('배당요구',470,140),
 g('명',0,130),g('증금',100,130),g('일자',220,130),g('일자',350,130),g('일자',470,130),
 g('김광순',0,100),g('35,000,000',100,100),g('2000.03.17',220,100),g('2008.10.24',350,100),g('2024.2.2',470,100),
 g('송상규',0,80),g('30,000,000',100,80),g('2010.05.03',220,80),g('2010.05.03',350,80),g('2024.2.2',470,80),
 g('이범희',0,60),g('2008.01.18',220,60),g('임동영',0,40),g('2006.10.23',220,40)];
 const tables=reconstructTableCandidates(items,1);assert.equal(tables.length,1);assert.equal(tables[0].headerLineCount,2);
 const a=analyzePages([{page:1,lines:[],tables}]);assert.deepEqual(a.tenants.map(x=>x.name),['김광순','송상규','이범희','임동영']);
 assert.equal(a.tenantCount.value,null);assert.equal(a.tenantCount.minObserved,4);
});
