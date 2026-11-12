/** Conservative line-based candidates where the PDF table cannot be reconstructed.
 * Candidate ≠ confirmed tenant, confirmed deposit, or confirmed person count.
 */
const cleanse=s=>String(s??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const personAtLineStart=/^([가-힣]{2,5})\s+(?=.{0,120}(?:\d{1,3}(?:,\d{3}){2,}|(?:19|20)\d{2}[.\-/]\d{1,2}))/;
const amount=/(?<!\d)(\d{1,3}(?:,\d{3}){2,})(?!\d)/g;
const companyPattern=/(?:주택도시보증(?:공사)?|한국토지주택공사|서울보증보험|주택금융공사)/;
const meta=/(?:<비고>|비고란|※\s*최선순위|부동산의 표시)/;
export function findTenantCandidates(pages){
 const candidates=[];
 for(const page of pages){
  const lines=page.lines||[];let inside=false;
  for(let i=0;i<lines.length;i++){
   const text=cleanse(lines[i].text);
   if(/(?:점유자\s+점유\s+정보출처|성\s*명\s+부분\s+구분|임차인\s*보증금)/.test(text))inside=true;
   if(meta.test(text))inside=false;
   if(!inside)continue;
   const match=text.match(personAtLineStart),prior=cleanse(lines[i-1]?.text);
   if(!match||companyPattern.test(match[1])||companyPattern.test(prior+match[1])||/(?:보증|권리|임차|신고|금액)$/.test(match[1]))continue;
   const money=[...text.matchAll(amount)].map(m=>m[1]);
   const dates=[...text.matchAll(/(?:19|20)\d{2}[.\-/]\d{1,2}(?:[.\-/]\d{1,2})?/g)].map(m=>m[0]);
   if(!money.length&&!dates.length)continue;
   candidates.push({name:match[1],rawLine:text,amountCandidates:money,dateCandidates:dates,
    source:{page:page.page,sourcePage:page.sourcePage??page.page,sourceFile:page.sourceFile??null,
     sourceId:page.sourceId??null,line:i+1,bbox:lines[i].bbox??null},
    status:'후보 · 표 셀 연결/동일인 확인 필요'});
  }
 }
 return candidates;
}
export function textQuality(lines){
 const text=(lines||[]).map(x=>x.text??'').join(''),glyphs=Array.from(text);
 if(!glyphs.length)return {needsOCR:true,reason:'문자 없음',badGlyphs:0,total:0};
 const bad=glyphs.filter(ch=>/[\uE000-\uF8FF\uD800-\uDFFF\uFFFD]/u.test(ch)).length;
 const needsOCR=bad>=4&&bad/glyphs.length>.012;
 return {needsOCR,reason:needsOCR?'비정상 글리프 감지':'원문 텍스트 사용',badGlyphs:bad,total:glyphs.length};
}
