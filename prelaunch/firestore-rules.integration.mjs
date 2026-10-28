import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,writeBatch,Timestamp,serverTimestamp} from 'firebase/firestore';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {belgiumTime,lockIds} from '../assets/schedule.mjs';
const env=await initializeTestEnvironment({projectId:'demo-chaims-security',firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../booking-backend/firestore.rules',import.meta.url),'utf8')}});
const uid='customer',email='customer@example.test';
const user=(id=uid,extra={})=>env.authenticatedContext(id,{email,email_verified:true,auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'google.com'},...extra}).firestore();
const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
function booking(db,id,hour=9,{overrides={},ledger=true,count=1,windowStart=serverTimestamp(),locks=true}={}){
 const batch=writeBatch(db),start=belgiumTime(day,hour),b={date:day,hour,name:'Test',phone:'123456789',address:'Test address',people:[{name:'Test',makeup:'guest'}],note:'',consent:true,uid,email,status:'pending_payment',reservationFee:2000,currency:'eur',startAt:Timestamp.fromMillis(start),createdAt:serverTimestamp(),durationMinutes:60,...overrides};
 batch.set(doc(db,'bookings',id),b);
 if(ledger)batch.set(doc(db,'bookingLimits',uid),{bookingId:id,windowStart,lastAt:serverTimestamp(),count});
 if(locks)for(const k of lockIds(start,b.durationMinutes||60))batch.set(doc(db,'timeLocks',k),{bookingId:id,hour:Number(k)});
 return batch.commit();
}
let count=0;async function check(name,fn){await env.clearFirestore();await fn();console.log('PASS '+name);count++;}
try{
 await check('valid booking with atomic ledger and locks',()=>assertSucceeds(booking(user(),'valid')));
 await check('no CAPTCHA substitute: unauthenticated write denied',()=>assertFails(booking(env.unauthenticatedContext().firestore(),'anon')));
 await check('unverified identity denied',()=>assertFails(booking(user(uid,{email_verified:false}),'unverified')));
 await check('missing ledger denied',()=>assertFails(booking(user(),'noledger',9,{ledger:false})));
 await check('forged duration denied',()=>assertFails(booking(user(),'duration',9,{overrides:{durationMinutes:30}})));
 await check('missing duration denied',()=>{const db=user(),batch=writeBatch(db);batch.set(doc(db,'bookings','missing'),{uid,email,status:'pending_payment',createdAt:serverTimestamp()});return assertFails(batch.commit());});
 await check('missing locks denied',()=>assertFails(booking(user(),'nolocks',9,{locks:false})));
 await check('same-day booking denied',()=>{const today=new Date().toISOString().slice(0,10);return assertFails(booking(user(),'today',9,{overrides:{date:today,startAt:Timestamp.fromMillis(belgiumTime(today,9))}}));});
 await check('second request inside one minute denied',async()=>{await booking(user(),'first');await assertFails(booking(user(),'second',12,{count:2}));});
 await check('rolling daily request limit denied',async()=>{const start=Timestamp.fromMillis(Date.now()-3600000);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'bookingLimits',uid),{bookingId:'old',windowStart:start,lastAt:start,count:5}));await assertFails(booking(user(),'sixth',9,{count:6,windowStart:start}));});
 await check('legitimate repeat after cooldown allowed',async()=>{const start=Timestamp.fromMillis(Date.now()-3600000);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'bookingLimits',uid),{bookingId:'old',windowStart:start,lastAt:start,count:1}));await assertSucceeds(booking(user(),'second',9,{count:2,windowStart:start}));});
 await check('new window resets only after 24 hours',async()=>{const start=Timestamp.fromMillis(Date.now()-25*3600000);await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'bookingLimits',uid),{bookingId:'old',windowStart:start,lastAt:start,count:5}));await assertSucceeds(booking(user(),'reset'));});
 await check('customer cannot approve own booking or read another',async()=>{await booking(user(),'own');await assertFails(setDoc(doc(user(),'bookings','own'),{status:'confirmed'},{merge:true}));await assertFails(getDoc(doc(user('other'),'bookings','own')));});
 await check('expired admin rejected at 30 minutes',async()=>{await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'owners','admin'),{enabled:true}));await assertFails(setDoc(doc(user('admin',{auth_time:Math.floor(Date.now()/1000)-1801}),'closedDates',day),{jobId:'test'}));await assertSucceeds(setDoc(doc(user('admin'),'closedDates',day),{jobId:'test'}));});
 await check('non-Google admin denied',async()=>{await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'owners','admin'),{enabled:true}));await assertFails(setDoc(doc(user('admin',{firebase:{sign_in_provider:'password'}}),'closedDates',day),{jobId:'test'}));});
 await check('vacation blocks customer booking',async()=>{await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'closedDates',day),{jobId:'test'}));await assertFails(booking(user(),'closed'));});
 await check('concurrent conflicting requests: only one succeeds',async()=>{const r=await Promise.allSettled([booking(user(),'race1'),booking(user(),'race2')]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);});
 console.log(`${count} authenticated rules/concurrency checks passed`);
}finally{await env.cleanup();}
