export const ZONE='Europe/Brussels';
export function dateKey(date=new Date()){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
export function belgiumTime(date,hour){let utc=Date.parse(`${date}T${String(hour).padStart(2,'0')}:00:00Z`);for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',hour12:false}).format(new Date(utc));utc+=(hour-Number(parts))*3600000;}return utc;}
// Hourly starts need hourly occupancy; rounding up preserves a full travel hour.
// The travel hour is shared between adjacent appointments, not doubled.
export function partyDuration(people){return people.reduce((sum,p)=>sum+(p.makeup==='bridal'?90:60),0);}
export function bookingDuration(booking){return Number.isInteger(booking.durationMinutes)&&booking.durationMinutes>=60&&booking.durationMinutes<=270?booking.durationMinutes:180;}
export function durationLabel(minutes){const hours=Math.floor(minutes/60),rest=minutes%60;return [hours?`${hours} hour${hours===1?'':'s'}`:'',rest?`${rest} minutes`:''].filter(Boolean).join(' ');}
export function lockIds(start,minutes=180){const hour=Math.floor(start/3600000);return Array.from({length:Math.ceil(minutes/60)+1},(_,n)=>String(hour+n));}
export function availableStarts(date,occupied,now=Date.now(),minutes=180){if(date<=dateKey(new Date(now)))return [];return Array.from({length:11},(_,i)=>i+9).filter(h=>{const t=belgiumTime(date,h);return t>now&&lockIds(t,minutes).every(id=>!occupied.has(id));}).map(hour=>({hour,start:belgiumTime(date,hour),label:`${String(hour).padStart(2,'0')}:00`}));}
export function validateParty(people){return Array.isArray(people)&&people.length>=1&&people.length<=3&&people.every(p=>p&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100&&['guest','bridal'].includes(p.makeup));}
