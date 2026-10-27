// Operational periods approved by the owner on 27 October 2026.
// This planner returns review candidates and NEVER deletes data.
export const APPROVED_POLICY={completedBookingDays:180,cancelledBookingDays:90,sentOutboxDays:7,errorDays:30,unpaidReviewDays:7};
const DAY=86400000;
const time=v=>v instanceof Date?v.getTime():typeof v?.toMillis==='function'?v.toMillis():typeof v==='string'?Date.parse(v):NaN;
export function retentionDecision(collection,record,now=Date.now()){
 if(record.legalHold===true||record.refundPending===true||record.disputeOpen===true)return {action:'keep',reason:'Legal, refund or dispute hold'};
 const age=(value,days)=>Number.isFinite(time(value))&&now-time(value)>days*DAY;
 if(collection==='bookings'){
  if(record.status==='pending_payment')return age(record.createdAt,APPROVED_POLICY.unpaidReviewDays)?{action:'review',reason:'Unpaid request; resolve the hold and notify before cancellation'}:{action:'keep',reason:'Active request'};
  if(record.status==='confirmed'){
   const start=time(record.startAt),duration=record.durationMinutes??180;
   if(!Number.isFinite(start)||!Number.isInteger(duration)||duration<60||duration>270)return {action:'review',reason:'Invalid appointment time or duration'};
   return now>start+duration*60000+APPROVED_POLICY.completedBookingDays*DAY?{action:'review',reason:'Operational retention elapsed; preserve required accounting evidence separately'}:{action:'keep',reason:'Upcoming appointment or within operational retention'};
  }
  if(record.status==='declined')return age(record.reviewedAt||record.calendarSyncAt,APPROVED_POLICY.cancelledBookingDays)?{action:'review',reason:'Cancelled booking retention elapsed; verify refund and accounting evidence'}:{action:'keep',reason:'Cancellation retention or timestamp unresolved'};
 }
 if(collection==='calendarSyncOutbox')return record.state==='sent'&&age(record.createdAt,APPROVED_POLICY.sentOutboxDays)?{action:'review',reason:'Delivered outbox snapshot can be removed'}:{action:'keep',reason:'Delivery incomplete or within retry/evidence window'};
 if(collection==='calendarSyncErrors')return age(record.at,APPROVED_POLICY.errorDays)?{action:'review',reason:'Error retention elapsed; confirm incident closed'}:{action:'keep',reason:'Recent or undated error'};
 if(collection==='vacationJobs')return ['complete','removed'].includes(record.status)&&Array.isArray(record.dates)&&record.dates.length&&record.dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T23:59:59Z'))&&Date.parse(d+'T23:59:59Z')<now)?{action:'review',reason:'Past vacation; check owned closedDates before removal'}:{action:'keep',reason:'Active vacation or unfinished cancellation'};
 return {action:'keep',reason:'No approved automated deletion rule for this collection'};
}
