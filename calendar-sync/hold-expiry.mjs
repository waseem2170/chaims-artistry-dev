import {lockIds,bookingDuration} from '../assets/schedule.mjs';
export const HOLD_MS=48*60*60*1000;
export function expiredHold(booking,now=Date.now()){
 const created=Date.parse(booking?.createdAt);
 return booking?.status==='pending_payment'&&Number.isFinite(created)&&created<=now-HOLD_MS;
}
export function holdQuery(now,cursor){
 const q={from:[{collectionId:'bookings'}],where:{fieldFilter:{field:{fieldPath:'createdAt'},op:'LESS_THAN_OR_EQUAL',value:{timestampValue:new Date(now-HOLD_MS).toISOString()}}},orderBy:[{field:{fieldPath:'createdAt'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:5};
 if(cursor?.createdAt&&cursor?.name)q.startAt={values:[{timestampValue:cursor.createdAt},{referenceValue:cursor.name}],before:false};
 return q;
}
export function holdCursor(docs){const d=docs.at(-1);return docs.length===5?{createdAt:d.fields.createdAt.timestampValue,name:d.name}:{createdAt:'',name:''};}
export function expiryLocks(booking){return lockIds(Date.parse(booking.startAt),bookingDuration(booking));}
