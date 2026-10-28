import {generateKeyPair,exportJWK,SignJWT} from 'jose';
const {publicKey,privateKey}=await generateKeyPair('RS256');
export const jwk={...await exportJWK(publicKey),kid:'test-key',use:'sig',alg:'RS256'};
export const claims={iss:'https://firebaseappcheck.googleapis.com/431354753019',aud:['projects/431354753019'],sub:'1:431354753019:web:46d39bca1fd16c11ce255e',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
export const sign=(overrides={},header={})=>new SignJWT({...claims,...overrides}).setProtectedHeader({alg:'RS256',typ:'JWT',kid:'test-key',...header}).sign(privateKey);
export const validToken=await sign();
