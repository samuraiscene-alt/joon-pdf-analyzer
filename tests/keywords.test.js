import test from 'node:test';import assert from 'node:assert/strict';import {findAuctionTerms} from '../src/keywords.js';
test('source coordinates retained',()=>{const r=findAuctionTerms([{page:2,lines:[{text:'임차인 보증금 배당요구',bbox:[1,2,3,4]}]}]);assert.ok(r.some(x=>x.term==='임차인'));assert.ok(r.some(x=>x.term==='배당요구'));assert.equal(r[0].source.page,2);});
test('negated mention not concluded',()=>{const r=findAuctionTerms([{page:1,lines:[{text:'유치권 성립하지 않음'}]}]);assert.equal(r.find(x=>x.term==='유치권').negationNearby,true);});
test('special terms tracked separately',()=>{const r=findAuctionTerms([{page:3,lines:[{text:'제시외건물 법정지상권'}]}]);assert.ok(r.some(x=>x.term==='제시외건물'));assert.ok(r.some(x=>x.term==='법정지상권'));});
