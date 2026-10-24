import {requireFreshAdmin} from './admin-session.mjs';
import {configureAttestation,bookingAttestation} from './firebase-attestation.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,query,where,runTransaction,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {dateKey,belgiumTime,lockIds,availableStarts,validateParty} from './schedule.mjs';
export async function connectBooking(config,onUser){
 const app=initializeApp(config.firebase);configureAttestation(app,config);
 const auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,onUser);
 const isAdmin=async()=>{const u=auth.currentUser;if(!u||!u.emailVerified)return false;const token=await u.getIdTokenResult();if(token.signInProvider!=='google.com')return false;const owner=await getDoc(doc(db,'owners',u.uid));return owner.exists()&&owner.data().enabled===true;};
 const requireAdmin=async()=>{try{await requireFreshAdmin(auth.currentUser);}catch(e){await signOut(auth);throw e;}if(!await isAdmin())throw Error('Admin access is required. Please sign in with your authorised Google account.');};
 return {
 verifyClient:bookingAttestation,
 signIn:()=>{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth,provider);},
 isEmailLink:()=>isSignInWithEmailLink(auth,location.href),
 sendEmailLink:async email=>{
  await sendSignInLinkToEmail(auth,email,{url:location.origin+location.pathname+'?emailSignIn=1',handleCodeInApp:true});
  localStorage.setItem('chaimsEmailForSignIn',email);
 },
 completeEmailLink:async email=>{
  const result=await signInWithEmailLink(auth,email,location.href);
  localStorage.removeItem('chaimsEmailForSignIn');
  history.replaceState(null,'',location.pathname+'?booking=1');
  return result;
 },
 signOut:()=>signOut(auth),isAdmin,requireAdmin,
 availability:async date=>{
  if(date<=dateKey())return [];
  const start=belgiumTime(date,9)/3600000,end=belgiumTime(date,23)/3600000;
  const snap=await getDocs(query(collection(db,'timeLocks'),where('hour','>=',start),where('hour','<',end)));
  return availableStarts(date,new Set(snap.docs.map(d=>d.id)));
 },
 book:async input=>{
  const u=auth.currentUser;if(!u)throw Error('Please sign in with Google or an email link.');
  await bookingAttestation();
  await u.getIdToken(true);
  if(!u.emailVerified)throw Error('Please verify your email using the sign-in link first.');
  if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>100)throw Error('Please enter your name.');
  if(typeof input.phone!=='string'||input.phone.trim().length<6||input.phone.trim().length>40)throw Error('Please enter a phone number with at least six characters.');
  if(typeof input.address!=='string'||!input.address.trim()||input.address.trim().length>500)throw Error('Please enter the appointment address.');
  if(typeof input.note!=='string'||input.note.length>1000||input.consent!==true)throw Error('Please check the notes and reservation policy.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isInteger(input.hour)||input.hour<9||input.hour>19)throw Error('Please choose an available date and time.');
  if(input.date<=dateKey())throw Error('Please choose a date from tomorrow onwards.');
  if(!validateParty(input.people))throw Error('Please check each person’s name and makeup service.');
  const ref=doc(collection(db,'bookings')),start=belgiumTime(input.date,input.hour),ids=lockIds(start);
  await runTransaction(db,async t=>{
   const locks=await Promise.all(ids.map(id=>t.get(doc(db,'timeLocks',id))));if(locks.some(s=>s.exists()))throw Error('This time was just reserved. Please choose another time.');
   t.set(ref,{...input,uid:u.uid,email:u.email,status:'pending_payment',reservationFee:input.people.length*2000,currency:'eur',startAt:Timestamp.fromMillis(start),createdAt:serverTimestamp()});
   ids.forEach(id=>t.set(doc(db,'timeLocks',id),{hour:Number(id),bookingId:ref.id}));
  });return {id:ref.id};
 },
 markReviewed:async id=>{await requireAdmin();await runTransaction(db,async t=>{const ref=doc(db,'bookings',id),snap=await t.get(ref);if(!snap.exists()||snap.data().status!=='pending_payment')throw Error('This request has already changed. Please refresh.');t.update(ref,{adminReviewedAt:serverTimestamp()});});},
 listAdminBookings:async()=>{await requireAdmin();const snap=await getDocs(query(collection(db,'bookings'),where('status','in',['pending_payment','confirmed','pending_approval','awaiting_payment'])));return snap.docs.map(d=>({...d.data(),id:d.id,start:d.data().startAt.toDate().toISOString()})).sort((a,b)=>a.start.localeCompare(b.start));},
 review:async(id,decision)=>{await requireAdmin();return runTransaction(db,async t=>{
  const ref=doc(db,'bookings',id),snap=await t.get(ref);if(!snap.exists())throw Error('Request not found.');const b=snap.data();
  if(decision==='confirm'&&b.status==='confirmed')return;
  if(!['pending_payment','pending_approval','awaiting_payment',...(decision==='decline'?['confirmed']:[])].includes(b.status))throw Error('This request has already been processed.');
  if(decision==='confirm'){t.update(ref,{status:'confirmed',confirmedAt:serverTimestamp()});}
  else{const ids=lockIds(b.startAt.toMillis()),locks=await Promise.all(ids.map(id=>t.get(doc(db,'timeLocks',id))));t.update(ref,{status:'declined',reviewedAt:serverTimestamp()});ids.forEach((key,i)=>{if(locks[i].data()?.bookingId===id)t.delete(doc(db,'timeLocks',key));});}
 });},
 };
}
