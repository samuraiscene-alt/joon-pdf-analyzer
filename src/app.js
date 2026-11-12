import {makeAuctionHandoff} from './tenant-review.js';
import {buildBlindReport,validationSummary} from './validation-report.js';
import {analyzePages,itemsToLines} from './analyzer.js';
import {findAuctionTerms} from './keywords.js';
import {imageToPage,isSupportedImage} from './ocr.js';
import {reconstructTableCandidates} from './table-layout.js';
import {assignFileIds,pagesForSource,sha256Blob} from './file-identity.js';
import {saveDocument,listDocuments,deleteDocument,exportAnalysis,downloadJson} from './records.js';
const $=id=>document.getElementById(id),status=$('status'),output=$('result'),pagesBox=$('pages'),recordsBox=$('records');
let current=null;const ver='4.10.38';
function tell(s){status.textContent=s;}
function showPage(p,label){const d=document.createElement('details'),s=document.createElement('summary'),pre=document.createElement('pre');s.textContent=label;pre.textContent=p.lines.map(x=>x.text).join('\n');d.append(s,pre);pagesBox.append(d);}
async function pdfPages(file){
 const pdfjs=await import(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.min.mjs`);
 pdfjs.GlobalWorkerOptions.workerSrc=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise,pages=[];
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i),items=(await page.getTextContent()).items;
  const lines=itemsToLines(items);
  if(lines.map(x=>x.text).join('').replace(/\s/g,'').length>=30){
   pages.push({page:i,lines,tables:reconstructTableCandidates(items,i),ocr:{engine:'pdfjs',tableRecognition:'candidate-only',reviewRequired:true}});
  }else{
   tell(`${file.name} ${i}/${pdf.numPages}쪽 스캔 OCR 중…`);
   const viewport=page.getViewport({scale:2});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error('스캔 페이지 이미지 생성 실패');
   const scanned=await imageToPage(blob,i,n=>tell(`${file.name} ${i}쪽 OCR ${n}%`));
   pages.push(scanned);
   canvas.width=0;canvas.height=0;
  }
 }
 return pages;
}
function renderOverview(data){
 const area=$('overview'),report=buildBlindReport(data),v=validationSummary(report);
 const header=document.createElement('div');header.className='overview-head';header.textContent=`${v.pages}쪽 분석 · 임차인 수 ${v.countLabel} · 표에서 추출한 기록 ${v.tenantRows}건 · 확인 필요 ${v.unresolvedCount}건`;
 area.append(header);
 const disclaimer=document.createElement('p');disclaimer.className='warn';disclaimer.textContent='표에서 추출된 기록 수는 실제 임차인 수와 다릅니다. 미확정은 정상적인 안전 표시입니다.';area.append(disclaimer);
 const listing=document.createElement('div');listing.className='tenant-list';
 if(!data.analysis.tenants?.length){const p=document.createElement('p');p.textContent='임차인 표에서 확정적으로 연결된 기록 없음 — 원본 검증 필요';listing.append(p);}
 for(const t of data.analysis.tenants||[]){const item=document.createElement('div');item.className='record';item.textContent=`${t.name} · 보증금 ${t.deposit||'미확인'} · 전입 ${t.moveIn||'미확인'} · 확정일자 ${t.fixedDate||'미확인'} · 배당요구 ${t.distributionRequest||'미확인'} · 근거 ${t.source?.page||'?'}쪽`;listing.append(item);}
 area.append(listing);
 const notes=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('pre');title.textContent='검토 필요 항목 · 원본 대조';body.textContent=JSON.stringify(data.analysis.unresolved||[],null,2);notes.append(title,body);area.append(notes);
}
$('files').addEventListener('change',async()=>{
 const files=Array.from($('files').files||[]);if(!files.length)return;
 const selected=assignFileIds(files);
 pagesBox.replaceChildren();output.textContent='';$('overview').replaceChildren();current=null;$('save').disabled=true;$('export').disabled=true;$('handoff').disabled=true;$('blind').disabled=true;
 const pages=[];
 try{
  for(const {file:f,sourceId} of selected){tell(`${f.name} 판독 중…`);let parts;
   if(f.type==='application/pdf'||/\.pdf$/i.test(f.name))parts=await pdfPages(f);
   else if(isSupportedImage(f))parts=[await imageToPage(f,1,n=>tell(`${f.name} OCR ${n}%`))];
   else throw Error('지원하지 않는 형식: '+f.name+' (HEIC은 JPEG로 변환)');
   for(const p of parts){const item={...p,page:pages.length+1,sourceId,sourceFile:f.name,sourcePage:p.page};pages.push(item);showPage(item,`${f.name} ${p.page}쪽`);}
  }
  const a=analyzePages(pages);a.keywords=findAuctionTerms(pages);
  a.provenanceWarning='표 복원은 후보 단계입니다. 다중행·병합 셀과 법률 판단은 사람의 원본 검증이 필요합니다.';
  a.scannedPages=pages.filter(p=>p.ocr?.engine==='tesseract.js').length;
  a.tableCandidates=pages.reduce((n,p)=>n+(p.tables?.length||0),0);
  current={files,selected,pages,analysis:a};output.textContent=JSON.stringify(a,null,2);renderOverview(current);$('save').disabled=false;$('export').disabled=false;$('handoff').disabled=false;$('blind').disabled=false;
  tell(`${pages.length}쪽 · 표 후보 ${a.tableCandidates}개 · OCR ${a.scannedPages}쪽 · 확인 필요`);
 }catch(e){tell('판독 실패: '+e.message);}
});
$('blind').addEventListener('click',async()=>{if(!current)return;try{tell('원본 파일 해시 계산 중…');const sourceHashes=await Promise.all(current.files.map(sha256Blob));const report=buildBlindReport({...current,sourceHashes});downloadJson(report,'joon-blind-test-'+Date.now()+'.json');tell('앱 자체 판독 결과를 정답 없는 상태로 내보냈습니다 ✓');}catch(e){tell('검증 보고서 생성 실패: '+e.message);}});
$('handoff').addEventListener('click',()=>{if(!current)return;downloadJson(makeAuctionHandoff(current.analysis),'joon-auction-handoff.json');});
$('save').addEventListener('click',async()=>{
 if(!current)return;
 try{
  for(const {file:f,sourceId} of current.selected){const pages=pagesForSource(current.pages,sourceId);const analysis=analyzePages(pages);analysis.keywords=findAuctionTerms(pages);analysis.provenanceWarning=current.analysis.provenanceWarning;
   const sourceHash=await sha256Blob(f);
   await saveDocument({filename:f.name,mimeType:f.type,blob:f,pages,analysis,sourceHash});}
  tell('원본 + 각 파일별 분석 저장 완료 ✓');await refresh();
 }catch(e){tell('저장 실패: '+e.message);}
});
$('export').addEventListener('click',()=>{if(!current)return;const r={id:'unsaved',createdAt:new Date().toISOString(),filename:current.files.map(f=>f.name).join(', '),mimeType:'mixed',caseKey:current.analysis.caseNumber,analysis:current.analysis,pages:current.pages};downloadJson(exportAnalysis(r),'joon-analysis.json');});
async function refresh(){recordsBox.replaceChildren();try{const rec=await listDocuments();if(!rec.length){recordsBox.textContent='저장된 문서가 없습니다.';return;}
 for(const r of rec){const div=document.createElement('div'),name=document.createElement('span');div.className='record';name.textContent=r.filename+' · '+new Date(r.createdAt).toLocaleString('ko-KR');const original=document.createElement('button');original.textContent='원본';original.onclick=()=>{const url=URL.createObjectURL(r.blob),a=document.createElement('a');a.href=url;a.download=r.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};const handoff=document.createElement('button');handoff.textContent='연동 JSON';handoff.onclick=()=>downloadJson(makeAuctionHandoff(r.analysis,{documentId:r.id,sourceHash:r.sourceHash,filename:r.filename}),'joon-handoff-'+r.id+'.json');const json=document.createElement('button');json.textContent='JSON';json.onclick=()=>downloadJson(exportAnalysis(r),'joon-'+r.id+'.json');const del=document.createElement('button');del.textContent='삭제';del.onclick=async()=>{if(!confirm('원본 및 분석 결과 삭제?'))return;await deleteDocument(r.id);await refresh();};div.append(name,original,json,handoff,del);recordsBox.append(div);}
 }catch(e){recordsBox.textContent='기기 저장소 오류: '+e.message;}}
refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
