import {vacationDates,affectedBookings,withTimeout} from './vacation.mjs';
import {requireFreshAdmin} from './admin-session.mjs';
import {configureAttestation,bookingAttestation} from './firebase-attestation.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,collection,doc,getDoc,getDocs,getDocFromServer,getDocsFromServer,writeBatch,updateDoc,arrayUnion,query,where,runTransaction,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import {dateKey,belgiumTime,lockIds,availableStarts,validateParty} from './schedule.mjs';
export async function connectBooking(config,onUser){
 const app=initializeApp(config.firebase);configureAttestation(app,config);
 const auth=getAuth(app),db=getFirestore(app);
 onAuthStateChanged(auth,onUser);
 const isAdmin=async()=>{const u=auth.currentUser;if(!u||!u.emailVerified)return false;const token=await u.getIdTokenResult();if(token.signInProvider!=='google.com')return false;const owner=await getDoc(doc(db,'owners',u.uid));return owner.exists()&&owner.data().enabled===true;};
 const requireAdmin=async()=>{try{await requireFreshAdmin(auth.currentUser);}catch(e){await signOut(auth);throw e;}if(!await isAdmin())throw Error('Admin access is required. Please sign in with your authorised Google account.');};
 return {
 verifyClient:bookingAttestation,
 signIn:()=>{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return withTimeout(signInWithPopup(auth,provider),45000);},
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
  const [closed,snap]=await withTimeout(Promise.all([getDocFromServer(doc(db,'closedDates',date)),getDocsFromServer(query(collection(db,'timeLocks'),where('hour','>=',start),where('hour','<',end)))]));
  if(closed.exists())return [];
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
   const closed=await t.get(doc(db,'closedDates',input.date));if(closed.exists())throw Error('This date is unavailable. Please choose another day.');
   const locks=await Promise.all(ids.map(id=>t.get(doc(db,'timeLocks',id))));if(locks.some(s=>s.exists()))throw Error('This time was just reserved. Please choose another time.');
   t.set(ref,{...input,uid:u.uid,email:u.email,status:'pending_payment',reservationFee:input.people.length*2000,currency:'eur',startAt:Timestamp.fromMillis(start),createdAt:serverTimestamp()});
   ids.forEach(id=>t.set(doc(db,'timeLocks',id),{hour:Number(id),bookingId:ref.id}));
  });return {id:ref.id};
 },
 markReviewed:async id=>{await requireAdmin();await runTransaction(db,async t=>{const ref=doc(db,'bookings',id),snap=await t.get(ref);if(!snap.exists()||snap.data().status!=='pending_payment')throw Error('This request has already changed. Please refresh.');t.update(ref,{adminReviewedAt:serverTimestamp()});});},
 listAdminBookings:async()=>{await requireAdmin();const snap=await getDocs(query(collection(db,'bookings'),where('status','in',['pending_payment','confirmed','pending_approval','awaiting_payment'])));return snap.docs.map(d=>({...d.data(),id:d.id,start:d.data().startAt.toDate().toISOString()})).sort((a,b)=>a.start.localeCompare(b.start));},
 listVacations:async()=>{await requireAdmin();const snap=await getDocsFromServer(collection(db,'vacationJobs'));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.dates[0].localeCompare(b.dates[0]));},
 blockVacation:async values=>{await requireAdmin();const dates=vacationDates(values);if(dates.some(d=>d<dateKey()))throw Error('Vacation dates cannot be in the past.');const job=doc(collection(db,'vacationJobs')),batch=writeBatch(db);dates.forEach(date=>batch.set(doc(db,'closedDates',date),{jobId:job.id,createdAt:serverTimestamp()}));batch.set(job,{dates,createdAt:serverTimestamp(),sent:[],cancelled:[],status:'processing'});await batch.commit();return job.id;},
 vacationCancellations:async jobId=>{await requireAdmin();const jobRef=doc(db,'vacationJobs',jobId),jobSnap=await getDocFromServer(jobRef);if(!jobSnap.exists())throw Error('Vacation not found.');const job=jobSnap.data();if(job.status==='removed')return [];const snap=await getDocsFromServer(query(collection(db,'bookings'),where('status','in',['pending_payment','confirmed','pending_approval','awaiting_payment'])));const affected=affectedBookings(snap.docs.map(d=>({id:d.id,...d.data()})),job.dates);
  for(const booking of affected){await requireAdmin();await runTransaction(db,async t=>{const ref=doc(db,'bookings',booking.id),current=await t.get(ref);if(!current.exists()||!['pending_payment','confirmed','pending_approval','awaiting_payment'].includes(current.data().status))return;const b=current.data();const closed=await t.get(doc(db,'closedDates',b.date));if(!closed.exists())return;const ids=lockIds(b.startAt.toMillis()),locks=await Promise.all(ids.map(id=>t.get(doc(db,'timeLocks',id))));t.update(ref,{status:'declined',reviewedAt:serverTimestamp(),vacationJob:jobId});t.update(jobRef,{cancelled:arrayUnion(booking.id)});ids.forEach((key,i)=>{if(locks[i].data()?.bookingId===booking.id)t.delete(doc(db,'timeLocks',key));});});}
  const latest=(await getDocFromServer(jobRef)).data();return (latest.cancelled||[]).filter(id=>!(latest.sent||[]).includes(id));
 },
 vacationNotified:async(jobId,id)=>{await requireAdmin();await updateDoc(doc(db,'vacationJobs',jobId),{sent:arrayUnion(id)});},
 finishVacation:async jobId=>{await requireAdmin();await updateDoc(doc(db,'vacationJobs',jobId),{status:'complete'});},
 removeVacation:async jobId=>{await requireAdmin();await runTransaction(db,async t=>{const ref=doc(db,'vacationJobs',jobId),snap=await t.get(ref);if(!snap.exists()||snap.data().status!=='complete')throw Error('Finish pending cancellation updates before reopening these dates.');const days=await Promise.all(snap.data().dates.map(date=>t.get(doc(db,'closedDates',date))));for(const day of days)if(day.exists()&&day.data().jobId===jobId)t.delete(day.ref);t.update(ref,{status:'removed'});});},
 review:async(id,decision)=>{await requireAdmin();return runTransaction(db,async t=>{
  const ref=doc(db,'bookings',id),snap=await t.get(ref);if(!snap.exists())throw Error('Request not found.');const b=snap.data();
  if(decision==='confirm'&&b.status==='confirmed')return;
  if(!['pending_payment','pending_approval','awaiting_payment',...(decision==='decline'?['confirmed']:[])].includes(b.status))throw Error('This request has already been processed.');
  if(decision==='confirm'){const closed=await t.get(doc(db,'closedDates',b.date));if(closed.exists())throw Error('This date is blocked for vacation.');t.update(ref,{status:'confirmed',confirmedAt:serverTimestamp()});}
  else{const ids=lockIds(b.startAt.toMillis()),locks=await Promise.all(ids.map(id=>t.get(doc(db,'timeLocks',id))));t.update(ref,{status:'declined',reviewedAt:serverTimestamp()});ids.forEach((key,i)=>{if(locks[i].data()?.bookingId===id)t.delete(doc(db,'timeLocks',key));});}
 });},
 };
}
