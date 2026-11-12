/** Unique import identity: identical filenames do not imply identical documents. */
export function assignFileIds(files){return Array.from(files,(file,index)=>({file,sourceId:`source-${index+1}`}));}
export function pagesForSource(pages,sourceId){return pages.filter(p=>p.sourceId===sourceId);}
export async function sha256Blob(blob){
 if(!(blob instanceof Blob))throw new TypeError('Expected Blob');
 if(!globalThis.crypto?.subtle)throw new Error('이 브라우저에서는 SHA-256 파일 확인이 지원되지 않습니다.');
 const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
