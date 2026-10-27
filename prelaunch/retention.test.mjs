import test from 'node:test';import assert from 'node:assert/strict';import {retentionDecision} from './retention-plan.mjs';
const now=Date.parse('2026-10-27T12:00:00Z'),ago=days=>new Date(now-days*86400000).toISOString();
for(const [name,collection,record,action] of [
 ['upcoming booking','bookings',{status:'confirmed',startAt:'2026-11-01T09:00:00Z'},'keep'],
 ['old completed booking','bookings',{status:'confirmed',startAt:ago(181),durationMinutes:60},'review'],
 ['exact retention boundary','bookings',{status:'confirmed',startAt:ago(180),durationMinutes:60},'keep'],
 ['unpaid holds need review','bookings',{status:'pending_payment',createdAt:ago(8)},'review'],
 ['recent unpaid','bookings',{status:'pending_payment',createdAt:ago(1)},'keep'],
 ['cancelled with unresolved timestamp','bookings',{status:'declined'},'keep'],
 ['cancelled with old timestamp','bookings',{status:'declined',reviewedAt:ago(91)},'review'],
 ['refund hold','bookings',{status:'declined',reviewedAt:ago(100),refundPending:true},'keep'],
 ['legal hold','bookings',{status:'confirmed',startAt:ago(500),legalHold:true},'keep'],
 ['dispute hold','bookings',{status:'declined',reviewedAt:ago(500),disputeOpen:true},'keep'],
 ['sent outbox','calendarSyncOutbox',{state:'sent',createdAt:ago(8)},'review'],
 ['pending outbox','calendarSyncOutbox',{state:'pending',createdAt:ago(100)},'keep'],
 ['failed outbox','calendarSyncOutbox',{state:'review',createdAt:ago(100)},'keep'],
 ['recent error','calendarSyncErrors',{at:ago(1)},'keep'],
 ['old error','calendarSyncErrors',{at:ago(31)},'review'],
 ['past complete vacation','vacationJobs',{status:'complete',dates:['2026-10-25']},'review'],
 ['future vacation','vacationJobs',{status:'complete',dates:['2026-11-01']},'keep'],
 ['unfinished vacation','vacationJobs',{status:'processing',dates:['2026-10-25']},'keep'],
 ['admin records preserved','owners',{enabled:true},'keep'],
 ['auth accounts not deleted','users',{lastLoginAt:ago(900)},'keep'],
 ['invalid appointment','bookings',{status:'confirmed',startAt:'invalid'},'review']
])test(name,()=>assert.equal(retentionDecision(collection,record,now).action,action));
test('planner is read only and does not mutate source data',()=>{const record=Object.freeze({status:'confirmed',startAt:ago(500)});assert.equal(retentionDecision('bookings',record,now).action,'review');assert.equal(record.status,'confirmed');});
