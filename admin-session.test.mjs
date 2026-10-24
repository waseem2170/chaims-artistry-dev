import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionValid,requireFreshAdmin} from './assets/admin-session.mjs';
test('admin session expires exactly at 30 minutes, independent of token refresh',async()=>{const time='2026-10-23T12:00:00Z',start=Date.parse(time);assert.equal(sessionValid(time,start+1799999),true);assert.equal(sessionValid(time,start+1800000),false);assert.equal(sessionValid('bad',start),false);assert.equal(sessionValid(time,start-1),false);await assert.rejects(requireFreshAdmin({getIdTokenResult:async()=>({authTime:time,issuedAtTime:new Date().toISOString()})}));});
