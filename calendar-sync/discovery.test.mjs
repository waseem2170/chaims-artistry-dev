import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingQuery,nextCursor,PAGE_SIZE,pendingQuery} from './discovery.mjs';
test('discovery pages by time and document identity without requiring a composite status index',()=>{
 const q=bookingQuery(Date.UTC(2026,9,27));assert.equal(q.limit,20);assert.equal(q.where.fieldFilter.field.fieldPath,'startAt');assert.deepEqual(q.orderBy.map(x=>x.field.fieldPath),['startAt','__name__']);assert.equal(q.startAt,undefined);
 const docs=Array.from({length:PAGE_SIZE},(_,i)=>({name:'projects/p/databases/(default)/documents/bookings/'+i,fields:{startAt:{timestampValue:'2026-10-29T18:00:00Z'}}}));
 const cursor=nextCursor(docs),next=bookingQuery(Date.UTC(2026,9,27),cursor);assert.equal(next.startAt.before,false);assert.equal(next.startAt.values[1].referenceValue,docs.at(-1).name);assert.deepEqual(nextCursor(docs.slice(0,2)),{startAt:'',name:''});
});
test('email retries discover pending outbox entries even after a booking was cancelled',()=>{assert.equal(pendingQuery().from[0].collectionId,'calendarSyncOutbox');assert.equal(pendingQuery().where.fieldFilter.value.stringValue,'pending');});
