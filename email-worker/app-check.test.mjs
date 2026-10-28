import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyAppCheck} from './app-check.mjs';
import {jwk,sign,validToken} from './app-check-fixture.mjs';
test('App Check verifies signatures, project, app, expiry and required claims',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
 try{
  assert.equal((await verifyAppCheck(validToken)).sub,'1:431354753019:web:46d39bca1fd16c11ce255e');
  for(const claims of [{iss:'attacker'},{aud:['projects/other']},{sub:'other-app'},{exp:1},{exp:undefined},{iat:9999999999}])await assert.rejects(verifyAppCheck(await sign(claims)),e=>e.status===403);
  for(const token of [null,'','broken',validToken.slice(0,-10)+'AAAAAAAAAA'])await assert.rejects(verifyAppCheck(token),e=>e.status===403);
  await assert.rejects(verifyAppCheck(await sign({},{typ:'other'})),e=>e.status===403);
 }finally{globalThis.fetch=original;}
});
