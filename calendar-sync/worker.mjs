import {processBooking} from './core.mjs';
import {calendarEvents,bookingEmail,customerCalendarFile} from '../email-worker/worker.mjs';
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...b)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function token(json,scope){const key=JSON.parse(json),iat=Math.floor(Date.now()/1000),head=b64(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'}))),body=b64(enc.encode(JSON.stringify({iss:key.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat,exp:iat+3600}))),pem=key.private_key.replace(/-----[^-]+-----|\s/g,'');const imported=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const sig=b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',imported,enc.encode(head+'.'+body))));const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+body+'.'+sig})});if(!r.ok)throw Error('Credential rejected');return (await r.json()).access_token;}
const decode=v=>v.stringValue??v.booleanValue??(v.integerValue!==undefined?Number(v.integerValue):v.timestampValue??(v.arrayValue?(v.arrayValue.values||[]).map(decode):v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):null));
const fields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:String(v)}]));
export async function run(env){
 if(env.SYNC_VALIDATE_ONLY==='true'){
  const db=await token(env.FIRESTORE_SYNC_SERVICE_ACCOUNT,'https://www.googleapis.com/auth/datastore');
  const cal=await token(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT,'https://www.googleapis.com/auth/calendar.events.readonly');
  const d=await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/calendarSyncHealth/connection`,{headers:{Authorization:'Bearer '+db}});
  if(!d.ok&&d.status!==404)throw Error('Database connection rejected '+d.status);
  const c=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events?maxResults=1`,{headers:{Authorization:'Bearer '+cal}});
  if(!c.ok)throw Error('Calendar connection rejected '+c.status);
  console.info('Calendar sync connection check passed; no bookings changed or emails sent.');
  return;
 }
 if(env.SYNC_ENABLED!=='true')return;
 if(env.SYNC_MODE!=='dev')throw Error('Only DEV mode is implemented');
 const ids=(env.TEST_BOOKING_IDS||'').split(',').map(s=>s.trim()).filter(Boolean),emails=new Set((env.TEST_RECIPIENTS||'').split(',').map(s=>s.trim().toLowerCase()));
 if(!ids.length||ids.length>20||ids.some(id=>!/^\w{1,100}$/.test(id))||!emails.size)throw Error('DEV allowlists required');
 const dbToken=await token(env.FIRESTORE_SYNC_SERVICE_ACCOUNT,'https://www.googleapis.com/auth/datastore'),calToken=await token(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT,'https://www.googleapis.com/auth/calendar.events.readonly');
 const base=`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`,name=path=>base.slice(base.indexOf('projects/'))+'/'+path;
 async function request(url,options={}){const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+dbToken,'Content-Type':'application/json'}});if(!r.ok)throw Error('Database operation failed '+r.status);return r.json();}
 async function read(path){const r=await fetch(base+'/'+path,{headers:{Authorization:'Bearer '+dbToken}});if(r.status===404)return null;if(!r.ok)throw Error('Database read failed');const d=await r.json();return {data:Object.fromEntries(Object.entries(d.fields||{}).map(([k,v])=>[k,decode(v)])),version:d.updateTime};}
 async function transactionalRead(paths,transaction){const response=await request(base+':batchGet',{method:'POST',body:JSON.stringify({documents:paths.map(name),transaction})});return new Map(response.map(d=>[d.found?.name||d.missing,d.found?Object.fromEntries(Object.entries(d.found.fields||{}).map(([k,v])=>[k,decode(v)])):null]));}
 const io={
 readBooking:async id=>{const d=await read('bookings/'+id);if(!d)return null;if(d.data.calendarSyncTest!==true||!emails.has(d.data.email?.toLowerCase()))throw Error('Booking is not an authorised DEV test');return {...d.data,_version:d.version};},
 readEvent:async id=>{const b=await io.readBooking(id),[event]=await calendarEvents(b,id,env.FIREBASE_PROJECT_ID);const r=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events/${event.id}`,{headers:{Authorization:'Bearer '+calToken}});if(r.status===404)return null;if(!r.ok)throw Error('Calendar read failed');return r.json();},
 report:async(id,message)=>{await request(base+'/calendarSyncErrors/'+id,{method:'PATCH',body:JSON.stringify({fields:fields({message,at:new Date().toISOString()})})});},
 apply:async(id,booking,plan,etag)=>{
 const {transaction}=await request(base+':beginTransaction',{method:'POST',body:'{}'});
 try{const keys=[...new Set([...plan.oldLocks,...plan.newLocks])],paths=['bookings/'+id,'closedDates/'+plan.date,'calendarSyncOutbox/'+id,...keys.map(k=>'timeLocks/'+k)],docs=await transactionalRead(paths,transaction),current=docs.get(name('bookings/'+id));
 if(!current||current.status!=='confirmed'||current.startAt!==booking.startAt||current.email!==booking.email||current.calendarSyncTest!==true)throw Error('Booking changed; retry');
 if(docs.get(name('calendarSyncOutbox/'+id))?.state==='pending')throw Error('Previous customer email still pending');
 if(plan.status==='confirmed'&&docs.get(name('closedDates/'+plan.date)))throw Error('Vacation conflict');
 for(const k of plan.newLocks){const lock=docs.get(name('timeLocks/'+k));if(lock&&lock.bookingId!==id)throw Error('Time already occupied');}
 const update={status:plan.status,date:plan.date,hour:plan.hour,calendarSyncEtag:etag||'',calendarSyncAt:new Date().toISOString()},f=fields(update);f.startAt={timestampValue:plan.startAt};
 const writes=[{update:{name:name('bookings/'+id),fields:f},updateMask:{fieldPaths:[...Object.keys(update),'startAt']}}];
 for(const k of plan.oldLocks)if(!plan.newLocks.includes(k)&&docs.get(name('timeLocks/'+k))?.bookingId===id)writes.push({delete:name('timeLocks/'+k)});
 for(const k of plan.newLocks)writes.push({update:{name:name('timeLocks/'+k),fields:fields({bookingId:id,hour:Number(k)})}});
 writes.push({update:{name:name('calendarSyncOutbox/'+id),fields:fields({state:'pending',kind:plan.status==='declined'?'declined':'reschedule',key:crypto.randomUUID(),createdAt:new Date().toISOString()})}});
 await request(base+':commit',{method:'POST',body:JSON.stringify({transaction,writes})});
 }catch(e){await request(base+':rollback',{method:'POST',body:JSON.stringify({transaction})}).catch(()=>{});throw e;}
 }
 };
 async function deliver(id){const out=await read('calendarSyncOutbox/'+id);if(!out||out.data.state!=='pending')return;const b=await io.readBooking(id);if(!b)return;const o=out.data;if(Date.now()-Date.parse(o.createdAt)>23*3600000){await io.report(id,'Email retry window expired; review delivery before retrying');return;}
 const moved=o.kind==='reschedule';const content=bookingEmail(o.kind,{...b,rescheduleMessage:'Your appointment has been rescheduled. Your updated date and time are shown below. Please reply if this time does not work for you.'},id,env);
 const attachments=moved?[{filename:'CHAIMS-appointment.ics',content:btoa(String.fromCharCode(...enc.encode(customerCalendarFile(b,id)))),content_type:'text/calendar'}]:[];
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'calendar-sync-'+o.key},body:JSON.stringify({from:env.FROM_EMAIL,to:[b.email],reply_to:env.ADMIN_EMAIL,subject:moved?'CHAIMS · Your appointment has been rescheduled':'CHAIMS · Oops… your appointment has been cancelled',...content,attachments})});if(!r.ok)throw Error('Email delivery failed');
 await request(base+'/calendarSyncOutbox/'+id+'?currentDocument.updateTime='+encodeURIComponent(out.version)+'&updateMask.fieldPaths=state',{method:'PATCH',body:JSON.stringify({fields:fields({state:'sent'})})});
 }
 for(const id of ids){try{await deliver(id);await processBooking(io,id,env.FIREBASE_PROJECT_ID,Date.now());await deliver(id);}catch{await io.report(id,'Sync failed; check credentials and retry. No automatic cancellation was inferred.');}}
}
export default {fetch:()=>new Response('Not found',{status:404}),scheduled:(_controller,env,ctx)=>ctx.waitUntil(run(env))};
