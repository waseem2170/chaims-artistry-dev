import {bucket,bookingPage} from './admin-list.mjs';
import {ADMIN_SESSION_MS,requireFreshAdmin} from './admin-session.mjs';
import {sendBookingEmail} from './booking-email.js';
import {bookingConfig} from './booking-config.js';
const $=id=>document.getElementById(id),status=t=>$('admin-status').textContent=t;
let api,currentUser,bookings=[],activeTab='new',sessionVersion=0,page=1,search='',expiryTimer;
async function guard(){try{await requireFreshAdmin(currentUser);await api.requireAdmin();}catch(e){await api.signOut();status(e.message);throw e;}}

const date=t=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',dateStyle:'full',timeStyle:'short'}).format(new Date(t));
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
function render(){
 const host=$('admin-bookings');host.replaceChildren();host.setAttribute('aria-labelledby','tab-'+activeTab);
 document.querySelectorAll('[data-tab]').forEach(tab=>{const selected=tab.dataset.tab===activeTab;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;tab.querySelector('span').textContent=bookings.filter(b=>bucket(b)===tab.dataset.tab).length;});
 const result=bookingPage(bookings,activeTab,search,page,date);page=result.page;const {pages,visible,total}=result;$('admin-page').textContent=`Page ${page} of ${pages} · ${total} results`;$('admin-prev').disabled=page===1;$('admin-next').disabled=page===pages;if(!visible.length)host.append(text('p',search?'No bookings match your search.':'No '+({new:'new requests',queued:'requests awaiting payment',approved:'approved appointments'})[activeTab]+'.','admin-empty'));
 for(const b of visible){
  const card=document.createElement('article');card.className='admin-card';const feedback=text('p','','admin-card-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');const report=message=>{feedback.textContent=message;card.append(feedback);};card.append(text('h2',b.name),text('p',date(b.start),'admin-date'));
  const reference=document.createElement('div');reference.className='admin-reference';reference.append(text('span','Bank transfer reference'),text('strong',b.id));card.append(reference);
  const people=b.people||[{name:b.name,makeup:b.service}],fee=(b.reservationFee||people.length*2000)/100,details=document.createElement('dl');
  for(const [label,value] of [['Email',b.email],['Phone',b.phone],['Address',b.address||'—'],['People',people.map((p,i)=>`${i+1}. ${p.name} · ${p.makeup==='bridal'?'Bridal Makeup':'Guest Makeup'}`).join('\n')],['Reservation','€'+fee],...(b.note?[['Notes',b.note]]:[])])details.append(text('dt',label),text('dd',value));card.append(details);
  if(b.status==='confirmed'&&bookingConfig.googleCalendarEnabled){const sync=text('button','Sync Google Calendar','admin-secondary');sync.type='button';sync.onclick=async()=>{sync.disabled=true;sync.classList.add('is-loading');try{await guard();await sendBookingEmail(bookingConfig.emailEndpoint,currentUser,b.id,'calendar');report('Appointment updated in Google Calendar.');}catch(e){report(e.message);}finally{sync.disabled=false;sync.classList.remove('is-loading');}};card.append(sync);}

  if(b.status!=='confirmed'){const label=document.createElement('label');label.className='admin-review';const check=document.createElement('input');check.type='checkbox';check.checked=!!b.adminReviewedAt;check.disabled=check.checked;label.append(check,document.createTextNode(check.checked?'Reviewed · awaiting payment':'Reviewed — move to payment queue'));check.onchange=async()=>{check.disabled=true;card.classList.add('is-loading');try{await guard();await api.markReviewed(b.id);activeTab='queued';await load();}catch(e){check.checked=false;check.disabled=false;report(e.message);}finally{card.classList.remove('is-loading');}};card.append(label);}
  const actions=document.createElement('div');actions.className='admin-actions';
  for(const action of ['approve','decline','reschedule']){const button=document.createElement('button');button.type='button';button.textContent=action==='approve'?(b.status==='confirmed'?'Approved':'Approve'):action==='decline'?'Decline':'Reschedule';button.disabled=action==='approve'&&b.status==='confirmed';button.onclick=async()=>{
   try{await guard();}catch(e){report(e.message);return;}
   if(action==='reschedule'){const existing=card.querySelector('.admin-composer');if(existing){existing.remove();return;}composer(card,b);return;}
   if(!confirm(action==='approve'?`Have you received the full €${fee} reservation fee for reference ${b.id}?`:'Decline this appointment and release its time?'))return;
   actions.querySelectorAll('button').forEach(el=>el.disabled=true);button.classList.add('is-loading');card.setAttribute('aria-busy','true');
   try{await guard();await api.review(b.id,action==='approve'?'confirm':'decline');
    try{await sendBookingEmail(bookingConfig.emailEndpoint,currentUser,b.id,action==='approve'?'confirmed':'declined');await load();}
    catch{report('The appointment was saved, but its email or calendar update could not finish. Please retry.');const retry=text('button','Retry update','admin-secondary');retry.type='button';retry.onclick=async()=>{retry.disabled=true;retry.classList.add('is-loading');try{await guard();await sendBookingEmail(bookingConfig.emailEndpoint,currentUser,b.id,action==='approve'?'confirmed':'declined');await load();}catch(e){report(e.message);card.append(retry);}finally{retry.disabled=false;retry.classList.remove('is-loading');}};card.append(retry);}
   }catch(e){report(e.message);actions.querySelectorAll('button').forEach(el=>el.disabled=false);}finally{button.classList.remove('is-loading');card.removeAttribute('aria-busy');}
  };actions.append(button);}card.append(actions);host.append(card);
 }
}
function composer(card,b){
 const form=document.createElement('form');form.className='admin-composer';form.append(text('h3','Suggest another time'),text('p','To: '+b.email,'admin-notice'));
 const subjectLabel=text('label','Subject'),subject=document.createElement('input');subject.required=true;subject.maxLength=150;subject.value='CHAIMS · Let’s find another appointment time';subjectLabel.append(subject);
 const bodyLabel=text('label','Your message'),body=document.createElement('textarea');body.required=true;body.maxLength=2000;body.value=`Hello ${b.name},\n\nCould we arrange a different time for your appointment on ${date(b.start)}?\n\nPlease reply with the dates and times that work for you.\n\nWarm wishes,\nChaima · CHAIMS Artistry`;bodyLabel.append(body);
 const note=text('p','Sending this email keeps the current appointment and its time held.','admin-notice'),send=text('button','Send reschedule email','booking-submit');send.type='submit';const feedback=text('p','','admin-notice');feedback.setAttribute('role','status');form.append(subjectLabel,bodyLabel,note,send,feedback);let notificationId=crypto.randomUUID();
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity()||!body.value.trim())return;send.disabled=true;feedback.textContent='Sending…';send.classList.add('is-loading');try{await guard();await sendBookingEmail(bookingConfig.emailEndpoint,currentUser,b.id,'reschedule',[],{subject:subject.value.trim(),message:body.value.trim(),notificationId});feedback.textContent='Email sent. The client can reply directly to CHAIMS.';send.hidden=true;subject.readOnly=true;body.readOnly=true;}catch{feedback.textContent='Email could not be sent. Your draft is kept; please retry.';send.disabled=false;}finally{send.classList.remove('is-loading');}};card.append(form);body.focus();
}
async function load(){const version=sessionVersion,list=await api.listAdminBookings();if(version!==sessionVersion||!currentUser)return;bookings=list;render();}
for(const tab of document.querySelectorAll('[data-tab]')){tab.onclick=()=>{activeTab=tab.dataset.tab;page=1;render();};tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const names=['new','queued','approved'],i=names.indexOf(activeTab);activeTab=e.key==='Home'?'new':e.key==='End'?'approved':names[(i+(e.key==='ArrowRight'?1:2))%3];render();$('tab-'+activeTab).focus();};}
$('admin-search').oninput=e=>{search=e.target.value.trim().toLowerCase();page=1;render();};
$('admin-prev').onclick=()=>{page--;render();};$('admin-next').onclick=()=>{page++;render();};
$('admin-login').onclick=async()=>{if(!api)return;const button=$('admin-login');button.disabled=true;button.classList.add('is-loading');try{await api.signIn();}catch(e){status('Google sign-in did not finish. Please try again.');}finally{button.disabled=false;button.classList.remove('is-loading');}};
$('admin-logout').onclick=()=>api.signOut();$('admin-refresh').onclick=async()=>{const button=$('admin-refresh');button.disabled=true;button.classList.add('is-loading');try{await guard();await load();}catch(e){$('admin-bookings').textContent=e.message;}finally{button.disabled=false;button.classList.remove('is-loading');}};
try{api=await(await import('./firebase-booking.js')).connectBooking(bookingConfig,async user=>{
 clearTimeout(expiryTimer);const version=++sessionVersion;currentUser=user;bookings=[];$('admin-bookings').replaceChildren();$('admin-tools').hidden=true;$('admin-profile').hidden=true;$('admin-profile').open=false;$('admin-gate').hidden=false;$('admin-login').disabled=!api;
 if(!user)return status('');status('Checking admin access…');
 try{await requireFreshAdmin(user);const token=await user.getIdTokenResult();expiryTimer=setTimeout(()=>{expireAdmin();},Math.max(0,Date.parse(token.authTime)+ADMIN_SESSION_MS-Date.now()));if(!await api.isAdmin()){status('This Google account does not have admin access.');$('admin-login').textContent='Use another Google account';return;}if(version!==sessionVersion)return;$('admin-account').textContent=user.email;$('admin-avatar').textContent=(user.displayName||user.email||'C').slice(0,1).toUpperCase();$('admin-profile').hidden=false;$('admin-tools').hidden=false;$('admin-gate').hidden=true;status('');await load();}catch{await api.signOut();status('Please sign in again to start a fresh 30-minute admin session.');}
});$('admin-login').disabled=false;}catch{status('Could not connect securely. Please refresh.');}
// Recheck after sleep/backgrounding; timers may be suspended on mobile.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)guard().catch(()=>{});});

// Hide customer details immediately at expiry, even while sign-out is completing.
function expireAdmin(){sessionVersion++;currentUser=null;bookings=[];document.getElementById('admin-bookings').replaceChildren();document.getElementById('admin-tools').hidden=true;document.getElementById('admin-profile').hidden=true;document.getElementById('admin-gate').hidden=false;api.signOut().finally(()=>status('Your 30-minute admin session has expired. Please sign in again.'));}
window.addEventListener('focus',()=>{if(currentUser)guard().catch(()=>{});});
setInterval(()=>{if(currentUser)requireFreshAdmin(currentUser).catch(()=>expireAdmin());},15000);
