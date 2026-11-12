/** Conservative reconstruction of tenant table *candidates* from positioned PDF text.
 * Supports header words separated by whitespace and headers split across nearby lines.
 * It deliberately does NOT certify merged cell relationships or infer empty tenant names.
 */
const norm = s => String(s ?? '').normalize('NFKC').replace(/\s+/g,'').trim();
const HEADER_RULES=[
 ['성명',/^(?:성명|점유자|임차인명)$/],
 ['보증금',/^보증금$/],
 ['전입신고일자',/^(?:전입신고일자|전입일자|전입일|사업자등록신청일자)$/],
 ['확정일자',/^확정일자$/],
 ['배당요구일자',/^(?:배당요구일자|배당요구여부|배당요구)$/]
];
const findHeader = s => HEADER_RULES.find(([,rx])=>rx.test(norm(s)))?.[0] ?? null;
function visualRows(items,tolerance=3){
 const parts=(items||[]).filter(i=>norm(i.str)).map(i=>({text:String(i.str),x:i.transform?.[4]??0,y:i.transform?.[5]??0,w:Math.max(0,i.width??0)})).sort((a,b)=>b.y-a.y||a.x-b.x);
 const rows=[];
 for(const g of parts){let r=rows.find(r=>Math.abs(r.y-g.y)<=tolerance);if(!r){r={y:g.y,items:[]};rows.push(r);}r.items.push(g);}
 for(const r of rows)r.items.sort((a,b)=>a.x-b.x);
 return rows.sort((a,b)=>b.y-a.y);
}
function headerMatches(rows,ri){
 const base=rows[ri];const cluster=[base];
 for(let k=ri+1;k<Math.min(rows.length,ri+4);k++){
  if(base.y-rows[k].y>34||rows[k-1].y-rows[k].y>16)break;
  cluster.push(rows[k]);
 }
 const candidates=[];
 for(let depth=1;depth<=cluster.length;depth++){
  const byColumn=[];
  for(const r of cluster.slice(0,depth))for(const g of r.items){
   let c=byColumn.find(c=>Math.abs(c.x-g.x)<=8);
   if(!c){c={x:g.x,items:[]};byColumn.push(c);}c.items.push({text:g.text,y:r.y});
  }
  for(const c of byColumn){c.items.sort((a,b)=>b.y-a.y);c.label=findHeader(c.items.map(x=>x.text).join(''));}
  let matches=byColumn.filter(c=>c.label).sort((a,b)=>a.x-b.x);
  if(new Set(matches.map(m=>m.label)).size!==matches.length)continue;
  if(matches.length>=3&&matches.some(m=>m.label==='성명')&&matches.some(m=>m.label==='보증금')){
   candidates.push({matches,depth,score:matches.length});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.depth-b.depth);
 return candidates[0]??null;
}
export function reconstructTableCandidates(items,pageNumber=1){
 const rows=visualRows(items);const out=[];
 for(let ri=0;ri<rows.length;ri++){
  const header=headerMatches(rows,ri);if(!header)continue;
  const sorted=header.matches;
  const bounds=sorted.slice(1).map((h,i)=>(h.x+sorted[i].x)/2);
  const body=[];let blankOrAmbiguous=0;let lastY=rows[ri+header.depth-1].y;
  for(let j=ri+header.depth;j<rows.length&&body.length<70;j++){
   const r=rows[j];if(lastY-r.y>30||rows[ri].y-r.y>650)break;
   lastY=r.y;
   const cells=sorted.map(()=>[]);
   for(const g of r.items){let ci=bounds.findIndex(b=>g.x<b);if(ci<0)ci=sorted.length-1;cells[ci].push(g.text);}
   const vals=cells.map(c=>c.join(' ').trim());if(vals.every(v=>!v))continue;
   const name=norm(vals[sorted.findIndex(x=>x.label==='성명')]);
   if(name&&!/^[가-힣]{2,6}$/.test(name)){
    if(body.length)break;
    continue;
   }
   if(!name)blankOrAmbiguous++;
   body.push(vals);
  }
  if(body.length){out.push({id:`p${pageNumber}-candidate-${out.length+1}`,headers:sorted.map(m=>m.label),rows:body,
   extraction:'geometry-candidate',headerLineCount:header.depth,ambiguousRows:blankOrAmbiguous,verified:false});
   ri+=header.depth-1;
  }
 }
 return out;
}
