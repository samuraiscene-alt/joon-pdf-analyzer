import test from 'node:test';import assert from 'node:assert/strict';
import {buildBlindReport,validationSummary} from '../src/validation-report.js';
const result={analysis:{caseNumber:'2023타경5787',tenantCount:{value:null,status:'검증 필요',minObserved:4},tenants:[{name:'A'}],unresolved:[{reason:'표 확인'}],keywords:[{term:'유치권'}]},pages:[{page:1,sourceFile:'sample.pdf',sourcePage:1,lines:[{text:'임차인 A',bbox:[0,0,2,3]}]}],files:[{name:'sample.pdf',size:40,type:'application/pdf'}]};
test('blind report excludes invented ground truth',()=>{const r=buildBlindReport(result,'2026-11-12T00:00:00.000Z');assert.equal(r.groundTruth,null);assert.equal(r.comparison,null);assert.equal(r.files[0].name,'sample.pdf');});
test('unverified tenant count remains unverified',()=>{const r=buildBlindReport(result);assert.equal(validationSummary(r).countLabel,'미확정');assert.equal(r.summary.tenantRows,1);});
test('source evidence retains original document and page',()=>{const r=buildBlindReport(result);assert.equal(r.sources[0].sourcePage,1);assert.deepEqual(r.sources[0].lines[0].bbox,[0,0,2,3]);});
test('blank analysis rejected',()=>assert.throws(()=>buildBlindReport({analysis:null}),TypeError));
