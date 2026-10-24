import {initializeAppCheck,ReCaptchaEnterpriseProvider,getToken} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app-check.js';
let attestation;
const localPreview=()=>['localhost','127.0.0.1','[::1]'].includes(location.hostname);
export function configureAttestation(app,config){
 if(config.recaptchaEnterpriseSiteKey&&!localPreview())attestation=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(config.recaptchaEnterpriseSiteKey),isTokenAutoRefreshEnabled:true});
}
export async function bookingAttestation(){
 if(!attestation)return null;
 try{return (await getToken(attestation,false)).token;}
 catch{throw Error('The security check could not finish. Please refresh and try again.');}
}
