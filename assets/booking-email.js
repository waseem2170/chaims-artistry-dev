import {requireFreshAdmin} from './admin-session.mjs';
import {bookingAttestation} from './firebase-attestation.js';
// Files travel directly to the configured mail processor; no images are stored in Firestore.
export async function sendBookingEmail(endpoint,user,id,kind,images=[],options={}){
 if(kind!=='request')await requireFreshAdmin(user);
 if(!endpoint)throw Error('Email delivery is not connected yet.');
 const form=new FormData();form.set('bookingId',id);form.set('kind',kind);
 if(kind==='reschedule')for(const key of ['subject','message','notificationId'])form.set(key,options[key]||'');
 for(const {person,file} of images)form.append('person-'+person,file);
 const token=await bookingAttestation();
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),...(token?{'X-Firebase-AppCheck':token}:{})},body:form});
 if(!response.ok)throw Error(kind==='calendar'?'Google Calendar could not be updated. Please check the connection and retry.':'The booking is saved, but email delivery or calendar sync did not finish. Please retry without creating another booking.');
}
