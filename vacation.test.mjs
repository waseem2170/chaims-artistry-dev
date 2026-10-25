import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validDate,dateRange,vacationDates,affectedBookings,withTimeout} from './assets/vacation.mjs';
test('invalid and normalized dates are rejected without throwing',()=>{for(const d of ['2026-99-99','2026-02-30','bad'])assert.equal(validDate(d),false);assert.equal(validDate('2028-02-29'),true);});
test('inclusive ranges cross DST and year boundaries',()=>{assert.deepEqual(dateRange('2026-10-24','2026-10-26'),['2026-10-24','2026-10-25','2026-10-26']);assert.equal(dateRange('2026-12-31','2027-01-01').length,2);assert.throws(()=>dateRange('2026-11-01','2026-10-01'));assert.throws(()=>dateRange('2026-01-01','2027-12-31'));});
test('vacation dates deduplicate and select only active affected bookings',()=>{assert.deepEqual(vacationDates(['2026-11-01','2026-11-01']),['2026-11-01']);const bookings=[{date:'2026-11-01',status:'confirmed'},{date:'2026-11-01',status:'declined'},{date:'2026-11-02',status:'pending_payment'}];assert.deepEqual(affectedBookings(bookings,['2026-11-01']),[bookings[0]]);});
test('stalled availability fails with a retryable message',async()=>{await assert.rejects(withTimeout(new Promise(()=>{}),5),/try again/);assert.equal(await withTimeout(Promise.resolve(42),10),42);});
