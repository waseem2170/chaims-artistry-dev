import {verifyAppCheck} from './app-check.mjs';
import {boundedFormData,notificationFresh,RequestError} from './security.mjs';
import {bookingDuration,durationLabel} from '../assets/schedule.mjs';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=value=>escapeHtml(value).replace(/\r?\n/g,'<br>');
const row=(label,value)=>`<tr><td style="padding:12px 0;border-bottom:1px solid #d3d3d3;color:#666666;font:13px Arial,sans-serif;vertical-align:top;width:32%">${escapeHtml(label)}</td><td style="padding:12px 0 12px 12px;border-bottom:1px solid #d3d3d3;color:#252525;font:15px/1.6 Arial,sans-serif;overflow-wrap:anywhere">${line(value)}</td></tr>`;
export function bookingEmail(kind,b,id,env){
 const when=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',dateStyle:'full',timeStyle:'short'}).format(new Date(b.startAt));
 const fee=new Intl.NumberFormat('en-BE',{style:'currency',currency:'EUR'}).format(b.reservationFee/100);
 const people=b.people.map((p,i)=>`${i+1}. ${p.name} · ${p.makeup==='bridal'?'Bridal Makeup':'Guest Makeup'}`).join('\n');
 const admin=kind==='admin',payment=kind==='request',confirmed=kind==='confirmed',reschedule=kind==='reschedule';
 const title=kind==='expired'?'Your reservation hold has expired.':reschedule?'Let’s find another time.':admin?'A new appointment request.':payment?'Your glam moment is calling!':confirmed?'You’re booked in girlll!':'Oops… your appointment has been cancelled.';
 const badge=reschedule?'LET’S PLAN YOUR VISIT':admin?'APPROVAL NEEDED':payment?'RESERVATION REQUEST':confirmed?'APPOINTMENT CONFIRMED':'APPOINTMENT UPDATE';
 const intro=kind==='expired'?'The 48-hour payment confirmation window has ended, so this appointment time has been released. If you already made a transfer, please reply before making another booking. Otherwise, you can request a new available time.':reschedule?b.rescheduleMessage:admin?'A customer has requested an appointment. Check the bank transfer before approving their reservation.':payment?'Thank you for choosing CHAIMS Artistry. You’ll find your appointment and reservation payment details below.':confirmed?'Your reservation payment has been received. We look forward to creating your look.':'Your appointment request has been declined or cancelled, and the time has been released. If you have already transferred payment, please reply to this email.';
 const greeting=admin?'Hello Chaima,':`Hello ${b.name},`;
 const detailRows=row('When',when+' · Belgium time')+row('Duration',durationLabel(bookingDuration(b)))+row('Address',b.address)+row('Your party',people)+(admin?row('Customer',b.name)+row('Email',b.email)+row('Phone',b.phone):'')+(b.note?row('Notes',b.note):'');
 const bankLines=String(env.BANK_DETAILS||'').split(/;|\r?\n/).map(s=>s.trim()).filter(Boolean).join('\n');
 const paymentBlock=payment?`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;background:#f2f2f2;border:1px solid #cccccc;border-radius:12px"><tr><td style="padding:24px"><p style="margin:0 0 8px;color:#555555;font:11px Arial,sans-serif;letter-spacing:2px">RESERVATION PAYMENT</p><p style="margin:0 0 18px;color:#222222;font:34px Georgia,serif">${escapeHtml(fee)}</p><p style="margin:0;color:#252525;font:15px/1.8 Arial,sans-serif">${line(bankLines)}</p><p style="margin:18px 0 4px;color:#555555;font:12px Arial,sans-serif">Payment reference</p><p style="margin:0;color:#222222;font:bold 14px/1.5 Arial,sans-serif;word-break:break-all">${escapeHtml(id)}</p><p style="margin:18px 0 0;color:#444444;font:13px/1.6 Arial,sans-serif">€20 per person. Payment must be verified within 48 hours of your request to keep your time. We’ll email your confirmation once payment is verified.</p></td></tr></table>`:'';
 const siteUrl=new URL(env.SITE_URL||'https://chaimsartistry.com/');
 if(!siteUrl.pathname.endsWith('/'))siteUrl.pathname+='/';
 const adminUrl=new URL(env.ADMIN_URL||'https://waseem2170.github.io/chaims-artistry-dev/admin.html');
 if(adminUrl.protocol!=='https:'&&adminUrl.protocol!=='http:')throw Error('Invalid site URL');
 const cta=admin?`<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px"><tr><td bgcolor="#eeeeee" style="border-radius:28px;text-align:center"><a href="${escapeHtml(adminUrl.href)}" style="display:inline-block;padding:16px 28px;color:#222222;text-decoration:none;font:bold 14px Arial,sans-serif">Review appointment</a></td></tr></table><p style="color:#666666;font:13px/1.6 Arial,sans-serif">Reservation fee: ${escapeHtml(fee)}. Inspiration images, when supplied, are attached and named by person.</p>`:'';
 const calendarCta=confirmed?'<p style="margin:28px 0 10px;color:#222222;font:bold 16px Arial,sans-serif">Add to your calendar</p><p style="color:#555555;font:14px/1.7 Arial,sans-serif">Open the attached <strong>CHAIMS-appointment.ics</strong> file and choose your calendar app to save your appointment. Changes to this saved copy are not automatically synchronised.</p>':'';
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)} | CHAIMS Artistry</title><style>@media(max-width:480px){.email-pad{padding:28px 22px!important}.email-title{font-size:34px!important}}</style></head><body style="margin:0;padding:0;background:#e5e5e5;color:#252525"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#e5e5e5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px"><tr><td bgcolor="#eeeeee" class="email-pad" style="padding:36px 38px;border-radius:18px 18px 0 0;border-bottom:1px solid #cccccc"><p style="text-align:center;margin:0;color:#333333;font:29px Georgia,serif;letter-spacing:5px">CHAIMS</p><p style="text-align:center;margin:8px 0 0;color:#333333;font:10px Arial,sans-serif;letter-spacing:4px">ARTISTRY</p><p style="margin:28px 0 12px;color:#555555;font:10px Arial,sans-serif;letter-spacing:2px">${badge}</p><h1 class="email-title" style="margin:0;color:#222222;font:normal 40px/1.15 Georgia,serif">${title}</h1></td></tr><tr><td bgcolor="#ffffff" class="email-pad" style="padding:34px 38px"><p style="margin:0 0 12px;font:16px/1.7 Arial,sans-serif">${escapeHtml(greeting)}</p><p style="margin:0 0 22px;color:#444444;font:15px/1.8 Arial,sans-serif">${line(intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detailRows}</table>${paymentBlock}${cta}${calendarCta}<p style="margin:28px 0 0;color:#666666;font:12px/1.6 Arial,sans-serif">Booking reference: <span style="word-break:break-all">${escapeHtml(id)}</span></p></td></tr><tr><td bgcolor="#eeeeee" align="center" style="padding:26px 22px;border-radius:0 0 18px 18px"><p style="margin:0 0 8px;color:#333333;font:18px Georgia,serif">A new beauty experience.</p><p style="margin:0;color:#555555;font:12px/1.8 Arial,sans-serif">Questions? Reply to this email.<br>CHAIMS Artistry</p></td></tr></table></td></tr></table></body></html>`;
 const text=[greeting,intro,when+' (Belgium time)','Duration: '+durationLabel(bookingDuration(b)),b.address,people,admin?`${b.email}\n${b.phone}`:'',b.note||'',payment?`Reservation payment: ${fee}\n${bankLines}\nPayment reference: ${id}\n€20 per person. Confirmation follows payment verification.`:'',admin?`Reservation fee: ${fee}\nReview: ${adminUrl.href}`:'',confirmed?'Add to your calendar: open the attached CHAIMS-appointment.ics file in your calendar app.':'',`Booking reference: ${id}`,'CHAIMS Artistry · A new beauty experience.'].filter(Boolean).join('\n\n');
 return {html,text};
}

export function customerCalendarLink(b,id){
 const start=new Date(b.startAt);if(!Number.isFinite(start.getTime()))throw Error('Invalid appointment date');
 const format=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const url=new URL('https://calendar.google.com/calendar/r/eventedit');
 url.search=new URLSearchParams({action:'TEMPLATE',text:'CHAIMS Artistry · Makeup appointment',dates:format(start)+'/'+format(new Date(start.getTime()+bookingDuration(b)*60000)),stz:'Europe/Brussels',etz:'Europe/Brussels',location:b.address||'',details:'Booking reference: '+id}).toString();
 return url.href;
}

// Optional Cloudflare Worker mail processor. No image/database storage binding.
// Configure secrets and verified sender before setting the website emailEndpoint.
const decode=v=>v.stringValue??(v.integerValue!==undefined?Number(v.integerValue):v.timestampValue??(v.arrayValue?(v.arrayValue.values||[]).map(decode):v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)])):null));
// The service account is shared only into the dedicated appointment calendar.
// Store its JSON key as an encrypted Cloudflare secret, never in website files.
const calendarB64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
async function calendarAccessToken(env) {
 const account=JSON.parse(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT);
 const now=Math.floor(Date.now()/1000),encoder=new TextEncoder();
 const header=calendarB64(encoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
 const claims=calendarB64(encoder.encode(JSON.stringify({iss:account.client_email,scope:'https://www.googleapis.com/auth/calendar.events',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
 const pem=account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const assertion=header+'.'+claims+'.'+calendarB64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(header+'.'+claims))));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
 if(!response.ok)throw Error('Calendar authentication failed');
 const result=await response.json();if(!result.access_token)throw Error('Calendar authentication failed');return result.access_token;
}
export async function calendarEvents(b,id,project) {
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(project+':'+id));
 const base=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const start=Date.parse(b.startAt);if(!Number.isFinite(start))throw Error('Invalid appointment date');
 const time=hours=>({dateTime:new Date(start+hours*3600000).toISOString(),timeZone:'Europe/Brussels'});
 const common={visibility:'private',transparency:'opaque',extendedProperties:{private:{chaimsBookingId:id,chaimsProject:project}},reminders:{useDefault:false}};
 return [
  {...common,id:base+'a',summary:'CHAIMS · '+b.name,location:b.address||'',description:[`Booking reference: ${id}`,b.email,b.phone,(b.people||[]).map((p,i)=>`${i+1}. ${p.name}: ${p.makeup==='bridal'?'Bridal Makeup':'Guest Makeup'}`).join('\n'),b.note||''].filter(Boolean).join('\n\n'),start:time(0),end:time(bookingDuration(b)/60)}
 ];
}
export async function syncCalendar(b,id,env,accessToken) {
 if(!env.GOOGLE_CALENDAR_ID||!env.GOOGLE_CALENDAR_SERVICE_ACCOUNT)throw Error('Google Calendar is not connected');
 if(!['confirmed','declined'].includes(b.status))throw Error('Only approved or cancelled appointments can sync');
 const token=accessToken||await calendarAccessToken(env);
 const events=await calendarEvents(b,id,env.FIREBASE_PROJECT_ID);
 const base='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(env.GOOGLE_CALENDAR_ID)+'/events';
 for(const event of events){
  const url=base+'/'+event.id;
  const options={headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}};
  if(b.status==='declined'){
   const response=await fetch(url+'?sendUpdates=none',{...options,method:'DELETE'});
   if(!response.ok&&![404,410].includes(response.status))throw Error('Calendar removal failed');
  }else{
   let response=await fetch(base+'?sendUpdates=none',{...options,method:'POST',body:JSON.stringify(event)});
   if(response.status===409){
    const existing=await fetch(url,options);if(!existing.ok)throw Error('Calendar event could not be checked');
    const stored=await existing.json();if(stored.extendedProperties?.private?.chaimsBookingId!==id||stored.extendedProperties?.private?.chaimsProject!==env.FIREBASE_PROJECT_ID)throw Error('Calendar event ownership mismatch');
    response=await fetch(url+'?sendUpdates=none',{...options,method:'PATCH',body:JSON.stringify(event)});
   }
   if(!response.ok)throw Error('Calendar update failed');
  }
 }
 // Remove the old deterministic break entry when upgrading an existing booking.
 const legacy=await fetch(base+'/'+events[0].id.slice(0,-1)+'b?sendUpdates=none',{method:'DELETE',headers:{Authorization:'Bearer '+token}});
 if(!legacy.ok&&![404,410].includes(legacy.status))throw Error('Old calendar break could not be removed');
 return events.map(e=>e.id);
}

export default {async fetch(request,env){
 const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',');
 if(!allowed.includes(origin))return new Response('Origin denied',{status:403});
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Firebase-AppCheck','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(message,status=200)=>new Response(message,{status,headers});
 if(request.method==='OPTIONS')return reply('');if(request.method!=='POST')return reply('Method not allowed',405);
 try{
  if(!env.RESEND_API_KEY||!env.BANK_DETAILS||!env.ADMIN_EMAIL||!env.FROM_EMAIL)return reply('Mail service not configured',503);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply('Sign in required',401);
  const appCheck=request.headers.get('X-Firebase-AppCheck');
  await verifyAppCheck(appCheck);
  const auth=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json','X-Firebase-AppCheck':appCheck},body:JSON.stringify({idToken:token})});
  if(!auth.ok)return reply('Invalid session',401);const u=(await auth.json()).users?.[0];if(!u?.emailVerified)return reply('Verified account required',403);
  const form=await boundedFormData(request),id=form.get('bookingId'),kind=form.get('kind');
  if(typeof id!=='string'||!/^\w{1,100}$/.test(id)||!['request','confirmed','declined','reschedule','calendar'].includes(kind))return reply('Invalid request',400);
  const base=`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/`;
  const read=path=>fetch(base+path,{headers:{Authorization:'Bearer '+token,...(appCheck?{'X-Firebase-AppCheck':appCheck}:{})}});
  const booking=await read('bookings/'+id);if(!booking.ok)return reply('Booking access denied',403);
  const b=Object.fromEntries(Object.entries((await booking.json()).fields).map(([k,v])=>[k,decode(v)]));
  if(kind==='request'&&(b.uid!==u.localId||b.email!==u.email||b.status!=='pending_payment'))return reply('Request not allowed',403);
  if(kind!=='request'){const admin=await read('owners/'+u.localId);if(!admin.ok)return reply('Admin action required',403);const owner=(await admin.json()).fields;if(owner?.enabled?.booleanValue!==true||(kind==='calendar'?!['confirmed','declined'].includes(b.status):kind==='reschedule'?!['pending_payment','confirmed'].includes(b.status):b.status!==kind))return reply('Admin action required',403);}
  if(kind==='calendar'){await syncCalendar(b,id,env);return reply('Calendar updated');}
  // Retry keys expire after 24h; disallow older notification requests to avoid repeat sends.
  const eventTime=kind==='confirmed'?b.confirmedAt:kind==='declined'?b.reviewedAt:b.createdAt;
  if(kind!=='reschedule'&&!notificationFresh(eventTime))return reply('Notification window expired; contact the customer manually',409);
  const attachments=[],counts={};
  for(const [field,file] of form){if(typeof file==='string')continue;const person=Number(field.replace('person-',''));if(!/^person-[0-2]$/.test(field)||person>=b.people.length||(counts[person]=(counts[person]||0)+1)>2||file.size>3*1024*1024)return reply('Invalid attachment',400);
   const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
   if(!png&&!jpg&&!webp)return reply('Unsupported image',400);let binary='';for(let n=0;n<bytes.length;n+=8192)binary+=String.fromCharCode(...bytes.subarray(n,n+8192));attachments.push({filename:`person-${person+1}-${counts[person]}.${png?'png':jpg?'jpg':'webp'}`,content:btoa(binary)});
  }
  if(kind!=='request'&&attachments.length)return reply('Attachments only allowed on new requests',400);
  const subject=form.get('subject'),message=form.get('message'),notificationId=form.get('notificationId');
  if(kind==='reschedule'&&(typeof subject!=='string'||!subject.trim()||subject.length>150||/[\r\n]/.test(subject)||typeof message!=='string'||!message.trim()||message.length>2000||typeof notificationId!=='string'||!/^[0-9a-f-]{36}$/i.test(notificationId)))return reply('Invalid reschedule email',400);
  if(kind==='reschedule')b.rescheduleMessage=message;
  const send=async(suffix,to,subject,templateKind,files=[])=>{const content=bookingEmail(templateKind,b,id,env);if(templateKind==='confirmed'){const bytes=new TextEncoder().encode(customerCalendarFile(b,id));files=[...files,{filename:'CHAIMS-appointment.ics',content:btoa(String.fromCharCode(...bytes)),content_type:'text/calendar'}];}const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`${id}-${kind}-${kind==='reschedule'?notificationId+'-':''}${suffix}`},body:JSON.stringify({from:env.FROM_EMAIL,reply_to:env.ADMIN_EMAIL,to:[to],subject,...content,attachments:files})});if(!res.ok)throw Error('Email provider rejected delivery');};
  if(kind==='request'){
   await send('client',b.email,'CHAIMS · Your reservation & payment details','request');
   await send('admin',env.ADMIN_EMAIL,'CHAIMS · New appointment to review','admin',attachments);
  }else if(kind==='reschedule')await send('client',b.email,subject,'reschedule');
  else await send('client',b.email,kind==='confirmed'?'CHAIMS · Your appointment is confirmed':'CHAIMS · Oops… your appointment has been cancelled',kind);
  if(['confirmed','declined'].includes(kind)&&env.GOOGLE_CALENDAR_ID){await syncCalendar(b,id,env);}
  return reply('Emails accepted');
 }catch(error){return error instanceof RequestError?reply(error.message,error.status):reply('Email delivery did not finish; retry the same booking',502);}
}};

// A portable calendar attachment for Apple Calendar and Outlook.
export function customerCalendarFile(b,id){
 const escape=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const start=new Date(b.startAt||b.start),end=new Date(start.getTime()+bookingDuration(b)*60000);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CHAIMS Artistry//Appointments//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+escape(id)+'@chaimsartistry.com','DTSTAMP:'+stamp(start),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:CHAIMS Artistry appointment','LOCATION:'+escape(b.address),'DESCRIPTION:'+escape('Your confirmed CHAIMS Artistry appointment. Reference: '+id),'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'];
 const encoder=new TextEncoder();return lines.map(line=>{let result='',length=0;for(const character of line){const size=encoder.encode(character).length;if(length+size>73){result+='\r\n ';length=1;}result+=character;length+=size;}return result;}).join('\r\n')+'\r\n';
}
