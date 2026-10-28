import {createLocalJWKSet,jwtVerify} from 'jose';
import {RequestError} from './security.mjs';
const projectNumber='431354753019',appId='1:431354753019:web:46d39bca1fd16c11ce255e';
let keys,loadedAt=0;
async function publicKeys(){
 if(!keys||Date.now()-loadedAt>=3600000){
  const response=await fetch('https://firebaseappcheck.googleapis.com/v1/jwks');
  if(!response.ok)throw new RequestError('Security verification unavailable. Please try again.',503);
  keys=createLocalJWKSet(await response.json());loadedAt=Date.now();
 }
 return keys;
}
export async function verifyAppCheck(token){
 if(typeof token!=='string'||!token||token.length>8192)throw new RequestError('Security check required. Please refresh and try again.',403);
 try{
  const result=await jwtVerify(token,await publicKeys(),{algorithms:['RS256'],typ:'JWT',issuer:'https://firebaseappcheck.googleapis.com/'+projectNumber,audience:'projects/'+projectNumber,subject:appId,requiredClaims:['exp','iat','sub']});
  if(result.payload.iat>Math.floor(Date.now()/1000)+30)throw Error('Future token');
  return result.payload;
 }catch(error){
  // Refresh on the next request after a rotation, with a bounded refresh frequency.
  if(error.code==='ERR_JWKS_NO_MATCHING_KEY'&&Date.now()-loadedAt>30000)loadedAt=0;
  if(error instanceof RequestError)throw error;
  throw new RequestError('Security check failed. Please refresh and try again.',403);
 }
}
