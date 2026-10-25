import test from 'node:test';import assert from 'node:assert/strict';
import {sortBookings} from './assets/admin-list.mjs';
import {customerCalendarFile} from './email-worker/worker.mjs';
test('request sorting handles Firestore timestamps and keeps original order intact',()=>{const data=[{id:'a',createdAt:{seconds:10},start:'2026-11-03'},{id:'b',createdAt:{seconds:20},start:'2026-11-01'}];assert.equal(sortBookings(data)[0].id,'b');assert.equal(sortBookings(data,'oldest')[0].id,'a');assert.equal(sortBookings(data,'date')[0].id,'b');assert.equal(data[0].id,'a');});
test('Apple calendar attachment escapes input and preserves three-hour UTC duration',()=>{const ics=customerCalendarFile({startAt:'2026-10-26T12:00:00Z',address:'Street, 1\nBEGIN:VEVENT'},'abc');assert.match(ics,/DTSTART:20261026T120000Z/);assert.match(ics,/DTEND:20261026T150000Z/);assert.match(ics,/Street\\, 1\\nBEGIN:VEVENT/);assert.equal(ics.split('\r\nBEGIN:VEVENT').length,2);});
