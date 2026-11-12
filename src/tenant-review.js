/** Conservative review groups: exact same names are candidates, never automatically merged.
 * A matching name is NOT proof of identity; conflicting values remain intact.
 */
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').trim();
export const TENANT_FIELDS=['deposit','moveIn','fixedDate','distributionRequest'];
export function createTenantReview(tenants=[]){
 const groups=new Map();
 for(const [index,tenant] of tenants.entries()){
  const key=norm(tenant.name);
  if(!key)continue;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({index,tenant});
 }
 return [...groups.entries()].map(([name,entries])=>{
  const fields={};const conflicts=[];
  for(const field of TENANT_FIELDS){
   const values=entries.map(({index,tenant})=>({value:String(tenant[field]??'').trim(),index,source:tenant.source})).filter(x=>x.value);
   const distinct=[...new Set(values.map(x=>norm(x.value)))];
   fields[field]={values,distinctCount:distinct.length,status:distinct.length>1?'불일치':values.length?'원문 기재':'미기재'};
   if(distinct.length>1)conflicts.push(field);
  }
  return {name,recordIndices:entries.map(x=>x.index),recordCount:entries.length,
   identityStatus:entries.length>1?'동명이인/중복기록 확인 필요':'단일 기록',
   isMerged:false,conflicts,fields,
   evidence:entries.map(({tenant})=>tenant.source??null)};
 });
}
export function makeAuctionHandoff(analysis,{documentId=null,sourceHash=null,filename=null}={}){
 if(!analysis||typeof analysis!=='object')throw new TypeError('analysis required');
 return {format:'joon-auction-handoff',schemaVersion:'1.0',producer:'JOON PDF ANALYZER',
  target:'auction-app-import-review',document:{id:documentId,filename,sha256:sourceHash},
  case:{court:null,caseNumber:analysis.caseNumber??null,itemNumber:null,identityVerified:false},
  sections:{tenants:{entries:analysis.tenants??[],review:analysis.tenantReview??createTenantReview(analysis.tenants??[]),count:analysis.tenantCount??null},
   seniorRights:{items:[],status:'원본 검증 필요'},occupants:{items:[],status:'원본 검증 필요'},
   liens:{items:[],status:'원본 검증 필요'},specialRights:{items:[],status:'원본 검증 필요'},
   possibleAssumedAmount:{value:null,currency:'KRW',status:'법률 검증 필요'}},
  keywords:analysis.keywords??[],unresolved:analysis.unresolved??[],
  importPolicy:{mode:'preview-only',automaticOverwrite:false,requiresUserReview:true}};
}
