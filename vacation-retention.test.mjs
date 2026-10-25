import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expiredVacation} from './assets/vacation.mjs';
test('vacation cleanup keeps current dates and unfinished cancellations',()=>{
assert.equal(expiredVacation({status:'complete',dates:['2026-10-24']},'2026-10-25'),true);
assert.equal(expiredVacation({status:'removed',dates:['2026-10-24']},'2026-10-25'),true);
for(const job of [{status:'complete',dates:['2026-10-24','2026-10-25']},{status:'pending',dates:['2026-10-24']},{status:'complete',dates:[]}])assert.equal(expiredVacation(job,'2026-10-25'),false);
});
