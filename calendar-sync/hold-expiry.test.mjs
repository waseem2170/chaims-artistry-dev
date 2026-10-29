import test from 'node:test';
import assert from 'node:assert/strict';
import {expiredHold,HOLD_MS,holdQuery,holdCursor,expiryLocks} from './hold-expiry.mjs';
const now=Date.parse('2026-11-01T10:00:00Z');
const b={status:'pending_payment',createdAt:new Date(now-HOLD_MS).toISOString(),startAt:'2026-11-05T10:00:00Z',durationMinutes:60};
test('unpaid hold expires exactly after 48 hours',()=>{assert.equal(expiredHold(b,now),true);assert.equal(expiredHold(b,now-1),false);});
test('confirmed, cancelled and malformed records never expire',()=>{for(const status of ['confirmed','declined','cancelled'])assert.equal(expiredHold({...b,status},now),false);for(const createdAt of [undefined,'bad',''])assert.equal(expiredHold({...b,createdAt},now),false);});
test('expiry scan paginates old records without excluding past appointments',()=>{const q=holdQuery(now,{createdAt:b.createdAt,name:'projects/p/databases/(default)/documents/bookings/x'});assert.equal(q.limit,5);assert.equal(q.where.fieldFilter.field.fieldPath,'createdAt');assert.equal(q.startAt.before,false);assert.deepEqual(holdCursor([]),{createdAt:'',name:''});});
test('release list includes actual duration and shared transit buffer',()=>{assert.equal(expiryLocks(b).length,2);assert.equal(expiryLocks({...b,durationMinutes:270}).length,6);});
