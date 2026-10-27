export const MAX_REQUEST_BYTES=20*1024*1024;
export class RequestError extends Error{constructor(message,status){super(message);this.status=status;}}
// Enforce the actual streamed size as Content-Length is optional and untrusted.
export async function boundedFormData(request,maxBytes=MAX_REQUEST_BYTES){
 const length=request.headers.get('Content-Length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw new RequestError('Files too large',413);
 if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;'))throw new RequestError('Multipart form required',400);
 const reader=request.body?.getReader();if(!reader)throw new RequestError('Empty request',400);
 const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new RequestError('Files too large',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();}catch{throw new RequestError('Invalid multipart form',400);}
}
export function notificationFresh(value,now=Date.now()){
 const timestamp=typeof value==='string'?Date.parse(value):NaN;
 return Number.isFinite(timestamp)&&timestamp<=now&&now-timestamp<=23*3600000;
}
