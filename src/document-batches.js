import {analyzePages} from './analyzer.js';
import {findAuctionTerms, summarizeAuctionTerms} from './keywords.js';
import {findRightStatements} from './rights-context.js';
import {pagesForSource} from './file-identity.js';
/** Each uploaded file has an isolated analysis. Never silently borrow a case number
 * from another file merely because it was selected in the same upload batch. */
export function analyzeDocumentBatch(selected,pages) {
 if(!Array.isArray(selected)||!Array.isArray(pages))throw new TypeError('selected and pages required');
 return selected.map(({file,sourceId})=>{
  const own=pagesForSource(pages,sourceId),analysis=analyzePages(own);
  analysis.keywords=findAuctionTerms(own);
  analysis.keywordSummary=summarizeAuctionTerms(analysis.keywords);
  analysis.rightStatements=findRightStatements(own);
  analysis.geometryTenantCandidates=own.flatMap(p=>(p.tenantGrid?.candidates||[]).map(x=>({...x,source:{...x.source,sourceId:p.sourceId,sourcePage:p.sourcePage,sourceFile:p.sourceFile}})));
  analysis.geometryTablePages=own.filter(p=>p.tenantGrid?.status==='candidate-only').map(p=>({sourcePage:p.sourcePage,sourceFile:p.sourceFile,candidateCount:p.tenantGrid.candidates.length}));
  analysis.scannedPages=own.filter(p=>p.ocr?.engine==='tesseract.js').length;
  analysis.tableCandidates=own.reduce((n,p)=>n+(p.tables?.length||0),0);
  analysis.provenanceWarning='표 복원 및 법적 판단 미검증: 원본 대조 필수';
  return {sourceId,filename:file.name,pageCount:own.length,caseNumber:analysis.caseNumber??null,
   identityVerified:false,pages:own,analysis};
 });
}
export function batchSummary(documents){
 const all=documents.flatMap(d=>d.pages);
 const cases=[...new Set(documents.map(d=>d.caseNumber).filter(Boolean))];
 return {fileCount:documents.length,pageCount:all.length,
  caseNumber:cases.length===1&&documents.every(d=>d.caseNumber===cases[0])?cases[0]:null,
  caseNumbers:cases,unidentifiedDocuments:documents.filter(d=>!d.caseNumber).map(d=>d.filename),
  totalTenantCandidates:documents.reduce((n,d)=>n+(d.analysis.tenantCandidates?.length||0),0),
  tableCandidates:documents.reduce((n,d)=>n+(d.analysis.tableCandidates||0),0),
  scannedPages:documents.reduce((n,d)=>n+(d.analysis.scannedPages||0),0),
  keywordMentions:documents.reduce((n,d)=>n+(d.analysis.keywords?.length||0),0),
  warning:'서로 다른 파일의 사건번호 및 임차인 정보는 자동 병합하지 않습니다.'};
}
