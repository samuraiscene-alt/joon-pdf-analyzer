export const GROUPS={
 '임대차·점유':['임차인','임대인','전차인','점유자','점유','권리금','임대차','현황조사','권리신고','임차보증금','보증금','차임','전입신고','확정일자','대항력'],
 '배당':['배당요구종기','배당요구','최우선변제','우선변제','배당'],
 '등기·순위':['최선순위','선순위','후순위','압류','가압류','가처분','근저당권','저당권','담보권','전세권','임차권등기','가등기','말소기준'],
 '특수권리·건물':['유치권','법정지상권','지상권','제시외건물','제시외 건물','무허가','위반건축물','대지권','분묘기지권','공유지분','토지별도등기'],
 '경매·가격':['감정평가','최저매각가격','유찰','재매각','인수','매각불허가','농지취득자격증명','매수신청보증금']
};
const NEGATION=/(없음|없다|해당\s*없|성립하지\s*않|존재하지\s*않|신고\s*없|미신고|부존재)/;
const terms=Object.entries(GROUPS).flatMap(([category,words])=>words.map(term=>({category,term}))).sort((a,b)=>b.term.length-a.term.length);
function overlaps(a,b){return a.start<b.end&&b.start<a.end;}
export function findAuctionTerms(pages){
 const results=[];
 for(const page of pages)for(let i=0;i<(page.lines||[]).length;i++){
  const source=page.lines[i],line=String(source.text||'').normalize('NFKC');
  const found=[];
  for(const item of terms){let start=0,pos;
   while((pos=line.indexOf(item.term,start))!==-1){
    const span={...item,start:pos,end:pos+item.term.length};
    if(!found.some(x=>overlaps(x,span)))found.push(span);
    start=pos+item.term.length;
   }
  }
  for(const hit of found.sort((a,b)=>a.start-b.start)){
   const context=line.slice(Math.max(0,hit.start-32),Math.min(line.length,hit.end+32));
   if(hit.term==='보증금'&&/매수신청\s*보증금/.test(context))continue;
   if(hit.term==='임차보증금'&&/매수신청\s*보증금/.test(context))continue;
   results.push({category:hit.category,term:hit.term,context,negationNearby:NEGATION.test(context),
    source:{page:page.page,sourceId:page.sourceId??null,sourceFile:page.sourceFile??null,
      sourcePage:page.sourcePage??page.page,line:i+1,bbox:source.bbox||null},
    status:'언급 확인 · 법적 판단 아님',note:''});
  }
 }
 return results;
}
/** Mentions are not distinct actual rights. Group by category and term for UI only. */
export function summarizeAuctionTerms(hits){
 const map=new Map();
 for(const hit of hits){
  const key=hit.category+'|'+hit.term;
  if(!map.has(key))map.set(key,{category:hit.category,term:hit.term,mentions:0,sourceLocations:[]});
  const record=map.get(key);record.mentions++;
  const at={page:hit.source.sourcePage??hit.source.page,sourceId:hit.source.sourceId??null};
  if(!record.sourceLocations.some(x=>x.page===at.page&&x.sourceId===at.sourceId))record.sourceLocations.push(at);
 }
 return [...map.values()].sort((a,b)=>b.mentions-a.mentions||a.term.localeCompare(b.term,'ko'));
}
