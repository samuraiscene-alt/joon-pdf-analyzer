/** Browser OCR; rasterized scanned PDFs and images use the same worker. */
export async function imageToPage(input,pageNumber=1,onProgress=()=>{}){
 const {createWorker}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm');
 const worker=await createWorker('kor+eng',1,{logger:m=>{if(m.status==='recognizing text')onProgress(Math.round((m.progress||0)*100));}});
 try{const result=await worker.recognize(input);
 const lines=(result.data.lines||[]).map(l=>({text:l.text.trim(),bbox:l.bbox?[l.bbox.x0,l.bbox.y0,l.bbox.x1,l.bbox.y1]:null,confidence:l.confidence??null})).filter(l=>l.text);
 if(!lines.length&&result.data.text)lines.push({text:result.data.text,bbox:null,confidence:result.data.confidence??null});
 return {page:pageNumber,lines,tables:[],ocr:{engine:'tesseract.js',confidence:result.data.confidence??null,tableRecognition:false,reviewRequired:true}};
 }finally{await worker.terminate();}}
export function isSupportedImage(file){return /^image\/(png|jpeg|webp|bmp)$/i.test(file.type)||/\.(png|jpe?g|webp|bmp)$/i.test(file.name);}
