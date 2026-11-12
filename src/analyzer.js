import {createTenantReview} from './tenant-review.js';
import {findTenantCandidates} from './tenant-candidates.js';
/**
 * JOON PDF ANALYZER v0.1.0
 * Provider-neutral analysis API. Does NOT infer legal priority or acquisition of debt.
 * Every record carries source provenance; uncertain matches stay unresolved.
 */
const normalize = s => String(s ?? '').normalize('NFKC').replace(/\s+/g,' ').trim();
const rxCase = /\b(20\d{2}\s*타경\s*\d+)\b/;
const rxWon = /(?:\d{1,3}(?:,\d{3})+|\d{5,})(?:\s*원)?/g;
const rxDate = /(?:19|20)\d{2}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}\.?/g;
const RISK_TERMS = [
  ['유치권','유치권 관련 기재'], ['법정지상권','법정지상권 관련 기재'],
  ['대항력','대항력 관련 기재'], ['가압류','가압류 관련 기재'],
  ['가처분','가처분 관련 기재'], ['임차권등기','임차권등기 관련 기재'],
  ['인수','인수 관련 기재'], ['미상','확인되지 않은 정보']
];
export function analyzePages(pages) {
  if (!Array.isArray(pages)) throw new TypeError('pages must be an array');
  const evidence = pages.flatMap(p => (p.lines || []).map((line, i) => ({
    page:p.page, line:i + 1, text:normalize(line.text), bbox:line.bbox || null
  })).filter(x=>x.text));
  const all = evidence.map(e=>e.text).join('\n');
  const caseMatch = all.match(rxCase);
  const riskMentions = evidence.flatMap(e => RISK_TERMS.filter(([term]) => e.text.includes(term))
    .map(([term,label]) => ({term,label,evidence:e,classification:'언급 확인 · 법적 판단 아님'})));
  const tables = pages.flatMap(p => (p.tables || []).map(t => ({page:p.page,...t})));
  const tenantTables = tables.filter(t => /점유자|임차인|보증금|성명/.test((t.headers||[]).join(' ')));
  const tenants = [];
  const unresolved = [];
  for (const t of tenantTables) {
    const headers=(t.headers||[]).map(normalize);
    const nameIdx=headers.findIndex(h=>/성명|점유자|임차인명/.test(h));
    if (nameIdx<0) {unresolved.push({reason:'성명 열을 식별하지 못함',page:t.page}); continue;}
    for (const [idx,row] of (t.rows||[]).entries()) {
      const name=normalize(row[nameIdx]);
      const source={page:t.page,table:t.id||null,row:idx+1};
      if (!name) {unresolved.push({reason:'빈 성명 셀 / 위 행에 연결 여부 미확인',source}); continue;}
      if (!/^[가-힣]{2,6}$/.test(name)) {unresolved.push({reason:'성명 판독 검토 필요',value:name,source});continue;}
      const field = pattern => {const i=headers.findIndex(h=>pattern.test(h));return i<0?null:normalize(row[i]);};
      tenants.push({name,deposit:field(/보\s*증\s*금/),moveIn:field(/전입|사업자등록/),fixedDate:field(/확정일자/),distributionRequest:field(/배당/),source,verified:false});
    }
  }
  const tenantReview=createTenantReview(tenants);
  const tenantCandidates=findTenantCandidates(pages);
  const distinctNames=[...new Set(tenants.map(x=>x.name))];
  const collisions = distinctNames.filter(n=>tenants.filter(x=>x.name===n).length>1);
  if(collisions.length) unresolved.push({reason:'동명이인 또는 복수 기록 여부 확인 필요',names:collisions});
  if(!tenantTables.length) unresolved.push({reason:'임차인 표 구조가 제공되지 않아 임차인 수 판단 보류'});
  if(tenantTables.some(t=>t.verified!==true)) unresolved.push({reason:'자동 복원된 표 후보는 원본과 수동 대조 전까지 확정 불가'});
  return {
    schemaVersion:'0.5', caseNumber:caseMatch?normalize(caseMatch[1]).replace(/\s/g,''):null,
    tenantCount:{value:unresolved.length?null:distinctNames.length,status:unresolved.length?'검증 필요':'잠정 추출',minObserved:distinctNames.length},
    tenants, tenantReview, tenantCandidates, risks:riskMentions, tablesDetected:tables.length,
    unresolved, observations:{money:[...new Set((all.match(rxWon)||[]))],dates:[...new Set((all.match(rxDate)||[]))]},
    status:'법적 판단 보류', evidenceCount:evidence.length
  };
}
export function itemsToLines(items, tolerance=3) {
  const glyphs=items.filter(i=>normalize(i.str)).map(i=>({text:i.str,x:i.transform?.[4]??0,y:i.transform?.[5]??0,width:i.width??0,height:i.height??0}));
  const rows=[];
  for(const g of glyphs.sort((a,b)=>b.y-a.y||a.x-b.x)) {
    let r=rows.find(r=>Math.abs(r.y-g.y)<=tolerance);
    if(!r){r={y:g.y,items:[]};rows.push(r);} r.items.push(g);
  }
  return rows.sort((a,b)=>b.y-a.y).map(r=>{
    const cells=r.items.sort((a,b)=>a.x-b.x);
    const text=cells.map((c,i)=> i&&c.x-(cells[i-1].x+cells[i-1].width)>4 ? ' '+c.text:c.text).join('');
    return {text:normalize(text),bbox:[Math.min(...cells.map(x=>x.x)),r.y,Math.max(...cells.map(x=>x.x+x.width)),Math.max(...cells.map(x=>x.y+x.height))]};
  });
}
