/** Document-grounded wording, not legal conclusions. 
 * A verbatim sentence and its source coordinates must survive every handoff. */
const rules=[
 {id:'tenant-succession',label:'임차권 승계 관계 기재',rx:/승계인|양도전\s*[:：]\s*임차권자|임차권자.{0,40}승계/},
 {id:'waiver',label:'대항력 포기 관련 기재',rx:/대항력.{0,15}포기|포기.{0,20}대항력/},
 {id:'registration-release',label:'임차권등기 말소 관련 기재',rx:/임차권등기.{0,20}말소/},
 {id:'pledge',label:'확약서 제출 기재',rx:/확약서.{0,20}제출|확약서/},
 {id:'special-sale',label:'특별매각조건 기재',rx:/특별매각조건/},
 {id:'retained-title',label:'법정지상권 관련 기재',rx:/법정지상권/},
 {id:'extra-building',label:'제시외 건물 관련 기재',rx:/제시\s*외\s*건물|제시외건물/}
];
const isTemplate=t=>/※\s*최선순위.{0,80}임차인|※\s*1\s*[:：]|※\s*2\s*[:：]|매각으로\s*소멸되는\s*가등기담보권/.test(t);
export function findRightStatements(pages){
 const out=[];
 for(const p of pages){
  const lines=p.lines||[];
  for(let i=0;i<lines.length;i++){
   const first=String(lines[i].text||'').trim(),next=String(lines[i+1]?.text||'').trim();
   const combined=(first+' '+next).trim();
   if(!first)continue;
   for(const rule of rules){
    if(!rule.rx.test(combined))continue;
    // Only start on lines with the match; continuation is attached for context.
    if(!rule.rx.test(first)&&i>0&&rule.rx.test(String(lines[i-1].text||'')+' '+first))continue;
    const context=combined.slice(0,650);
    const template=isTemplate(context);
    out.push({id:rule.id,label:rule.label,rawText:context,
     kind:template?'general-template':'document-statement',
     conclusion:'원문 기재 확인, 권리 성립·소멸 및 인수 여부는 미판정',
     source:{page:p.page,sourceId:p.sourceId??null,sourceFile:p.sourceFile??null,
       sourcePage:p.sourcePage??p.page,line:i+1,bbox:lines[i].bbox??null}});
   }
  }
 }
 const seen=new Set();
 return out.filter(x=>{const key=[x.id,x.source.sourceId,x.source.sourcePage,x.source.line].join(':');if(seen.has(key))return false;seen.add(key);return true;});
}
