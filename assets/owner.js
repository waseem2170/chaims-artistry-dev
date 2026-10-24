import {bookingConfig} from './booking-config.js';
const $=id=>document.getElementById(id),status=text=>$('owner-status').textContent=text;
if(!bookingConfig.firebase){status('Owner dashboard preview. Connect Firebase to sign in, publish availability and review requests.');$('owner-login').disabled=true;}
else{
 const {connectBooking}=await import('./firebase-booking.js');
 let api;
 const call=async(name,data)=>name==='listOwnerBookings'?api.listOwnerBookings():name==='publishSlot'?api.publishSlot(data):api.review(data.id,name==='confirmBankPayment'?'confirm':name==='cancelBooking'?'cancel':data.decision);
 $('owner-login').onclick=()=>api.signIn().catch(()=>status('Sign-in failed. Please try again.'));
 $('owner-logout').onclick=()=>api.signOut();
 async function load(){
  const result=await call('listOwnerBookings',{});$('owner-bookings').replaceChildren();
  if(!result.bookings.length)$('owner-bookings').textContent='No active appointments.';
  for(const b of result.bookings){const card=document.createElement('article');card.className='booking-summary';const heading=document.createElement('h3');heading.textContent=b.name+' · '+({pending_approval:'New request',awaiting_payment:'Awaiting bank transfer',confirmed:'Confirmed'})[b.status];card.append(heading);const email=document.createElement('a');email.className='booking-time';email.textContent='Email customer';email.href='mailto:'+encodeURIComponent(b.email)+'?subject='+encodeURIComponent('CHAIMS appointment · '+b.id)+'&body='+encodeURIComponent('Hi '+b.name+',\n\nRegarding your appointment on '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',dateStyle:'full',timeStyle:'short'}).format(new Date(b.start))+'.\nBooking reference: '+b.id+'\n\n');card.append(email);for(const text of [new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Brussels',dateStyle:'full',timeStyle:'short'}).format(new Date(b.start)),b.service,b.email,b.phone,b.note]){const p=document.createElement('p');p.textContent=text;card.append(p);}for(const decision of (b.status==='pending_approval'?['approve','decline','cancel']:b.status==='awaiting_payment'?['confirm','cancel']:[])){const button=document.createElement('button');button.className='booking-time';button.textContent=({approve:'Approve · awaiting transfer',decline:'Decline',confirm:'Confirm €20 received',cancel:'Cancel & release time'})[decision];button.onclick=async()=>{button.disabled=true;try{if(decision==='confirm'&&!window.confirm('Have you checked the bank account and received the full €20 for this booking?')){button.disabled=false;return;}if(decision==='cancel'&&!window.confirm('Cancel this unpaid request and release its appointment time?')){button.disabled=false;return;}await call(decision==='confirm'?'confirmBankPayment':decision==='cancel'?'cancelBooking':'reviewBooking',{id:b.id,decision,received:decision==='confirm'});status('Request updated. Please email the customer manually.');await load();}catch(e){status(e.message);button.disabled=false;}};card.append(button);}$('owner-bookings').append(card);}
 }
 api=await connectBooking(bookingConfig,async user=>{
  $('owner-tools').hidden=true;$('owner-login').hidden=!!user;$('owner-logout').hidden=!user;
  if(!user){status('Sign in to review appointments.');return;}
  if(!await api.isOwner()){status('This Google account does not have owner access.');return;}
  $('owner-tools').hidden=false;status('Signed in as '+user.email);try{await load();}catch(e){status(e.message);}
 });
 $('slot-form').onsubmit=async e=>{e.preventDefault();try{await call('publishSlot',{start:$('slot-start').value,end:$('slot-end').value});status('Your booking window is available to customers.');e.target.reset();}catch(err){status(err.message);}};
}
