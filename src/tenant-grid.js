/** PDF.js coordinate evidence. Every match remains a candidate, not a confirmed tenant. */
const clean=x=>String(x??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const notPerson=new Set(['주거','점유','점유자','부분','구분','비고','성명','정보','출처','보증금','차임','임차인','임차권','권리신고','주택도','시보증','공사','부증명서','권원','임대차','사업자']);
export function captureTextTokens(items,max=12000){
 return (items||[]).filter(i=>clean(i.str)&&Number.isFinite(i.transform?.[4])&&Number.isFinite(i.transform?.[5])).slice(0,max).map(i=>({text:clean(i.str),x:i.transform[4],y:i.transform[5],w:Math.max(0,i.width||0),h:Math.abs(i.height||0)}));
}
export function groupTextRows(tokens,tolerance=2.5){
 const rows=[];
 for(const t of [...(tokens||[])].filter(t=>t&&clean(t.text)).sort((a,b)=>b.y-a.y||a.x-b.x)){
  let row=rows.find(r=>Math.abs(r.y-t.y)<=tolerance);
  if(!row){row={y:t.y,tokens:[]};rows.push(row);} row.tokens.push(t);
 }
 return rows.sort((a,b)=>b.y-a.y).map(r=>({...r,tokens:r.tokens.sort((a,b)=>a.x-b.x),text:r.tokens.map(t=>t.text).join(' ')}));
}
function isPerson(t){const name=clean(t.text);return t.x<105&&/^[가-힣]{2,5}$/.test(name)&&!notPerson.has(name)&&!/(?:보증|권리|신고|차임|금액|임대|임차|등기|점유)$/.test(name);}
export function reconstructTenantGrid(tokens,{sourcePage=null,sourceFile=null,sourceId=null}={}){
 const rows=groupTextRows(tokens),unresolved=[];
 const heading=rows.findIndex((r,i)=>r.tokens.some(t=>clean(t.text)==='점유자')&&rows.slice(i,i+5).some(x=>/보\s*증\s*금|보증금/.test(x.text)));
 if(heading<0)return {status:'no-table-header',sourcePage,sourceFile,sourceId,headerEvidence:[],candidates:[],unresolved:[{reason:'표 머리글 좌표 미확인'}]};
 const bodyHeader=rows.findIndex((r,i)=>i>=heading&&i<=heading+8&&(/성\s*명/.test(r.text)||r.tokens.some(t=>clean(t.text)==='성명'))&&/부분|구분|권원/.test(r.text));
 const simpleHeader=rows.findIndex((r,i)=>i>=heading&&i<=heading+8&&r.tokens.some(t=>clean(t.text)==='성명'));
 const bodyStart=(bodyHeader>=0?bodyHeader:simpleHeader)+1;
 if(bodyStart<=0)return {status:'header-only',sourcePage,sourceFile,sourceId,headerEvidence:rows.slice(heading,heading+8),candidates:[],unresolved:[{reason:'성명 열 머리글 확인 실패'}]};
 const head=rows.slice(heading,bodyStart),candidates=[];let current=null;
 for(let j=bodyStart;j<rows.length;j++){
  const row=rows[j];
  if(/<\s*비고\s*>|비고란|※\s*최선순위|등기된 부동산에 관한 권리|매각에 따라 설정/.test(row.text))break;
  const names=row.tokens.filter(isPerson);
  const amounts=[...row.text.matchAll(/(?<!\d)\d{1,3}(?:,\d{3}){2,}(?!\d)/g)].map(x=>x[0]);
  const dates=[...row.text.matchAll(/(?<!\d)(?:19|20)\d{2}\s*[.\-/]\s*\d{1,2}(?:\s*[.\-/]\s*\d{1,2})?\.?(?!\d)/g)].map(x=>x[0]);
  if(names.length===1){current={name:names[0].text,source:{sourcePage,sourceFile,sourceId,y:row.y},evidenceRows:[],amountCandidates:[],dateCandidates:[],status:'좌표 기반 후보 · 원본 대조 필요'};candidates.push(current);}
  if(names.length>1){unresolved.push({reason:'같은 행에서 성명으로 보이는 글자가 복수 발견됨',y:row.y,values:names.map(x=>x.text)});current=null;}
  if(current){current.evidenceRows.push({y:row.y,text:row.text,tokens:row.tokens});current.amountCandidates.push(...amounts);current.dateCandidates.push(...dates);}
  else if(amounts.length||dates.length)unresolved.push({reason:'이름 없는 금액·날짜 행',y:row.y,text:row.text});
 }
 for(const c of candidates){c.amountCandidates=[...new Set(c.amountCandidates)];c.dateCandidates=[...new Set(c.dateCandidates)];}
 return {status:'candidate-only',sourcePage,sourceFile,sourceId,headerEvidence:head.map(r=>({y:r.y,text:r.text,tokens:r.tokens})),candidates,unresolved,notice:'병합셀·동일인·필드 연결 미검증. 임차인 총수 미확정'};
}