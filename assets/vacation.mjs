export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function dateRange(start,end){if(!validDate(start)||!validDate(end)||end<start)throw Error('Choose a valid start and end date.');const days=[];for(let t=Date.parse(start+'T12:00:00Z');t<=Date.parse(end+'T12:00:00Z');t+=86400000){if(days.length>=366)throw Error('Choose at most 366 vacation days.');days.push(new Date(t).toISOString().slice(0,10));}return days;}
export function vacationDates(values){const dates=[...new Set(values)].sort();if(!dates.length||dates.length>366||dates.some(d=>!validDate(d)))throw Error('Choose between 1 and 366 valid dates.');return dates;}
export const affectedBookings=(bookings,dates,hours=null)=>bookings.filter(b=>dates.includes(b.date)&&(!hours||blockedBooking({hours},b))&&['pending_payment','pending_approval','awaiting_payment','confirmed'].includes(b.status));
export async function withTimeout(promise,ms=12000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('The connection is taking too long. Please try again.')),ms))]);}finally{clearTimeout(timer);}}

export function expiredVacation(job,today){return ['complete','removed'].includes(job.status)&&Array.isArray(job.dates)&&job.dates.length>0&&job.dates.every(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<today);}

// Hourly blocks share the same one-hour travel buffer as appointments.
export function vacationHours(start=0,end=24){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>24||start>=end)throw Error('Choose an end time after the start time.');
 return Array.from({length:end-start+1},(_,i)=>start+i);
}
export function blockedBooking(closed,booking){
 if(!closed)return false;
 if(!Array.isArray(closed.hours))return true; // Existing full-day vacations.
 const minutes=Number.isInteger(booking.durationMinutes)?booking.durationMinutes:180;
 return Array.from({length:Math.ceil(minutes/60)+1},(_,i)=>booking.hour+i).some(hour=>closed.hours.includes(hour));
}
export function mergeClosure(closed,jobId,hours){
 const blocks={...(closed?.blocks||{})};
 if(closed?.jobId&&!closed.blocks)blocks[closed.jobId]=Array.from({length:25},(_,i)=>i);
 if(hours)blocks[jobId]=hours;else delete blocks[jobId];
 const combined=[...new Set(Object.values(blocks).flat())].sort((a,b)=>a-b);
 return Object.keys(blocks).length?{blocks,hours:combined,fullDay:Array.from({length:24},(_,i)=>i).every(h=>combined.includes(h))}:null;
}
