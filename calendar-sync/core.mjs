import {dateKey,lockIds} from '../assets/schedule.mjs';
// Pure validation: never trust arbitrary Calendar events as booking instructions.
export function planChange(booking,event,id,project,now=Date.now()){
 if(booking.status!=='confirmed')return null;
 if(event.status!=='cancelled'&&(event.extendedProperties?.private?.chaimsBookingId!==id||event.extendedProperties?.private?.chaimsProject!==project))throw Error('Calendar ownership mismatch');
 if(event.status==='cancelled')return {status:'declined',oldLocks:lockIds(Date.parse(booking.startAt)),newLocks:[],startAt:booking.startAt,date:booking.date,hour:booking.hour};
 if(event.recurrence||event.recurringEventId||!event.start?.dateTime||!event.end?.dateTime)throw Error('Only single timed appointments can sync');
 const start=Date.parse(event.start.dateTime),end=Date.parse(event.end.dateTime);
 if(!Number.isFinite(start)||end-start!==10800000)throw Error('Appointment must last three hours');
 if(start===Date.parse(booking.startAt))return null;
 const local=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(start)).map(p=>[p.type,p.value]));
 const date=dateKey(new Date(start)),hour=Number(local.hour);
 if(date<=dateKey(new Date(now))||hour<9||hour>19||local.minute!=='00'||local.second!=='00'||start%1000)throw Error('Choose a future date and an hourly start from 09:00 to 19:00');
 return {status:'confirmed',startAt:new Date(start).toISOString(),date,hour,oldLocks:lockIds(Date.parse(booking.startAt)),newLocks:lockIds(start)};
}
export async function processBooking(io,id,project,now){
 const booking=await io.readBooking(id);if(!booking||booking.status!=='confirmed')return 'ignored';
 const event=await io.readEvent(id); // Must fetch the deterministic ID, including cancelled events.
 if(!event)return 'missing'; // A 404 is NOT proof of cancellation.
 let plan;
 try{plan=planChange(booking,event,id,project,now);}catch(error){await io.report(id,error.message);return 'conflict';}
 if(!plan)return 'unchanged';
 // Adapter must atomically recheck the booking, locks and vacations, then save an outbox entry.
 try{await io.apply(id,booking,plan,event.etag);}catch(error){await io.report(id,error.message);return 'conflict';}
 return 'updated';
}
