import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {run} from './worker.mjs';
import {lockIds} from '../assets/schedule.mjs';
globalThis.crypto=webcrypto;
const encode=v=>typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:v&&typeof v==='object'?{mapValue:{fields:encodeFields(v)}}:{stringValue:v};
const encodeFields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,k==='startAt'?{timestampValue:v}:encode(v)]));
test('all-booking mode discovers unflagged bookings, moves locks, emails once, and then syncs cancellation',async()=>{
 const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const secret=JSON.stringify({client_email:'fixture@example.test',private_key:Buffer.from(await crypto.subtle.exportKey('pkcs8',key.privateKey)).toString('base64')});
 const base='projects/p/databases/(default)/documents/',id='fixture',day='2099-10-29',start=day+'T08:00:00.000Z',moved=day+'T11:00:00.000Z';
 const b={status:'confirmed',date:day,hour:9,startAt:start,durationMinutes:60,email:'test@example.test',name:'Test',address:'Test',people:[{name:'Test',makeup:'guest'}],reservationFee:2000};
 const docs=new Map();let revision=0;const save=(path,fields,merge=false)=>docs.set(base+path,{name:base+path,fields:merge?{...docs.get(base+path)?.fields,...fields}:fields,updateTime:String(++revision)});
 save('bookings/'+id,encodeFields(b));for(const k of lockIds(Date.parse(start),60))save('timeLocks/'+k,encodeFields({bookingId:id,hour:Number(k)}));
 let event={status:'confirmed',etag:'moved',start:{dateTime:moved},end:{dateTime:day+'T12:00:00.000Z'},extendedProperties:{private:{chaimsBookingId:id,chaimsProject:'p'}}};const mails=[];const original=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{const u=String(url),body=options.body&&typeof options.body==='string'?JSON.parse(options.body):null;const ok=data=>new Response(JSON.stringify(data),{status:200});
 if(u.includes('oauth2.googleapis.com'))return ok({access_token:'fixture-token'});
 if(u.includes('www.googleapis.com/calendar/'))return ok(event);
 if(u.includes('api.resend.com')){mails.push(body);return ok({id:'mail'});}
 if(u.endsWith(':runQuery')){const collection=body.structuredQuery.from[0].collectionId;return ok([...docs.values()].filter(d=>d.name.startsWith(base+collection+'/')&&(collection!=='calendarSyncOutbox'||d.fields.state.stringValue==='pending')).map(document=>({document})));}
 if(u.endsWith(':beginTransaction'))return ok({transaction:'transaction'});
 if(u.endsWith(':batchGet'))return ok(body.documents.map(n=>docs.has(n)?{found:docs.get(n)}:{missing:n}));
 if(u.endsWith(':commit')){for(const w of body.writes){if(w.delete)docs.delete(w.delete);else save(w.update.name.slice(base.length),w.update.fields,!!w.updateMask);}return ok({});}
 if(u.endsWith(':rollback'))return ok({});
 const path=decodeURIComponent(u.split('/documents/')[1]?.split('?')[0]||'');
 if(options.method==='PATCH'){save(path,body.fields,u.includes('updateMask'));return ok(docs.get(base+path));}
 return docs.has(base+path)?ok(docs.get(base+path)):new Response('{}',{status:404});
 };
 const env={SYNC_ENABLED:'true',SYNC_MODE:'bookings',FIREBASE_PROJECT_ID:'p',FIRESTORE_SYNC_SERVICE_ACCOUNT:secret,GOOGLE_CALENDAR_SERVICE_ACCOUNT:secret,GOOGLE_CALENDAR_ID:'cal',RESEND_API_KEY:'fixture',FROM_EMAIL:'test@example.test',ADMIN_EMAIL:'admin@example.test',SITE_URL:'https://example.test'};
 try{await run(env);assert.equal(docs.get(base+'bookings/'+id).fields.hour.integerValue,'12');assert.equal(mails.length,1);assert.match(mails[0].subject,/rescheduled/);assert.equal(docs.get(base+'calendarSyncOutbox/'+id).fields.state.stringValue,'sent');for(const k of lockIds(Date.parse(start),60))assert.ok(!docs.has(base+'timeLocks/'+k));for(const k of lockIds(Date.parse(moved),60))assert.equal(docs.get(base+'timeLocks/'+k).fields.bookingId.stringValue,id);
 await run(env);assert.equal(mails.length,1,'unchanged schedules do not resend');
 event={status:'cancelled',etag:'deleted'};await run(env);assert.equal(docs.get(base+'bookings/'+id).fields.status.stringValue,'declined');assert.equal(mails.length,2);assert.match(mails[1].subject,/cancelled/);for(const k of lockIds(Date.parse(moved),60))assert.ok(!docs.has(base+'timeLocks/'+k));await run(env);assert.equal(mails.length,2);
 }finally{globalThis.fetch=original;}
});
