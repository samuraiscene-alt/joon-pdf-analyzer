export const GROUPS={
 '임대차·점유':['임차인','임대인','전차인','점유자','점유','권리금','임대차','현황조사','권리신고','보증금','차임','전입신고','확정일자','대항력'],
 '배당':['배당요구','배당요구종기','우선변제','최우선변제','배당'],
 '등기·순위':['최선순위','선순위','후순위','압류','가압류','가처분','근저당권','저당권','담보권','전세권','임차권등기','가등기','말소기준'],
 '특수권리·건물':['유치권','법정지상권','지상권','제시외건물','제시외 건물','무허가','위반건축물','대지권','분묘기지권','공유지분','토지별도등기'],
 '경매·가격':['감정평가','최저매각가격','유찰','재매각','인수','매각불허가','농지취득자격증명']
};
const NEGATION=/(없음|없다|해당\s*없|성립하지\s*않|존재하지\s*않|신고\s*없|미신고|부존재)/;
export function findAuctionTerms(pages){const results=[];for(const page of pages)for(let i=0;i<(page.lines||[]).length;i++){
 const source=page.lines[i],line=String(source.text||'').normalize('NFKC');
 for(const [category,terms] of Object.entries(GROUPS))for(const term of terms){let start=0,pos;
 while((pos=line.indexOf(term,start))!==-1){const context=line.slice(Math.max(0,pos-32),Math.min(line.length,pos+term.length+32));
 results.push({category,term,context,negationNearby:NEGATION.test(context),source:{page:page.page,line:i+1,bbox:source.bbox||null},status:'언급 확인 · 법적 판단 아님',note:''});start=pos+term.length;}}}
 return results;}
