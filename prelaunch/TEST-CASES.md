# CHAIMS Artistry — release acceptance cases

Use synthetic names/addresses and an authorised test inbox only. Record case ID, commit/Worker version/rules version, device/browser, actual outcome, timestamp, and evidence. A listed case is **not** a pass until executed. No bulk mail, production load attack or real customer data is needed.

## Current evidence

94 local automated checks pass (see test source files and GO-LIVE-AUDIT.md). Three published-rule anonymous read simulations passed by denying access. Authenticated rule/emulator, real browser/device, outage and cross-provider cases below remain required. Existing earlier live Calendar reschedule/cancellation delivery evidence does not replace this release's full regression run.

## Identity and access

| ID | Action / input | Expected result | Evidence state |
|---|---|---|---|
| AUTH-01 | Submit directly while logged out | No booking/lock/email/calendar write | Mail boundary tested; rules write pending |
| AUTH-02 | Google sign-in, verified customer | Correct identity; no admin controls | Browser regression required |
| AUTH-03 | Send email link, open once in same browser | Return to booking with retained date/time; no extra verification prompt | Browser regression required |
| AUTH-04 | Open email link on another device | Clearly ask original email; verify with correct email only | Two-device test required |
| AUTH-05 | Reuse, expire or alter email link | Clear recovery message; no session or booking | Browser/Auth integration required |
| AUTH-06 | Sign out and use browser Back | No exposed editable customer fields or stale images | Browser required |
| AUTH-07 | Verified customer requests another UID's booking | Denied; no email sent | Mail mock passed; authenticated rules pending |
| AUTH-08 | Unverified identity submits | Denied | Mail mock passed; rules pending |
| AUTH-09 | Non-owner Google account opens admin | No records/actions available | Live authenticated test required |
| AUTH-10 | Admin action at 29:59 then 30:00 from original auth_time | First permitted, second denied; no email/calendar side effect | Pure session test passed; rule integration pending |
| AUTH-11 | Refresh ID token at minute 29 then action at minute 31 | Denied; token refresh cannot extend original session | Pure boundary test passed; live pending |
| AUTH-12 | Restore old tab after phone sleeps beyond 30 min | Sign out/reauthenticate before action | Mobile required |
| AUTH-13 | Forge owners record or list owners as customer | Denied | Anonymous read denied; authenticated write pending |
| AUTH-14 | Remove/disable owner; use existing signed-in tab | Next server action denied | Live authorised fixture required |
| AUTH-15 | Email/password user tries admin | Denied even if verified | Published-rule review; emulator pending |

## Database authority, concurrency and abuse (run in Firestore emulator)

| ID | Action / input | Expected result |
|---|---|---|
| DB-01 | Anonymous GET and list bookings/owners/outbox | Denied; three GET simulations passed; list pending |
| DB-02 | Customer A GET/list customer B's records | Denied; own query constrained by UID |
| DB-03 | Customer sets status confirmed, reduced fee, wrong currency or another UID/email | Denied for each mutation |
| DB-04 | Customer modifies/deletes an existing booking or another user's lock | Denied |
| DB-05 | Customer creates arbitrary standalone lock | Denied without same atomic new booking |
| DB-06 | Booking missing required locks, containing extra fields or invalid guest map | Denied |
| DB-07 | Duration inconsistent with party or omitted on a new request | Denied; current optional legacy-duration fallback needs hardening |
| DB-08 | Two authenticated customers submit identical slot simultaneously (20 repetitions) | Exactly one booking succeeds each time; no orphaned locks/emails |
| DB-09 | Overlapping different-start requests race | At most one incompatible booking succeeds |
| DB-10 | Vacation creation and customer submission race | No committed active booking on blocked day after vacation workflow settles; affected notice sent once |
| DB-11 | Expired admin uses SDK and direct REST for every mutation | All denied; UI timer alone is insufficient |
| DB-12 | Customer can read public availability | Only hour/booking reference and non-sensitive closed-date metadata; never name/address/phone |
| DB-13 | Missing, invalid, wrong-app and expired App Check tokens via SDK/REST/Worker | Denied after enforcement; presently monitoring-only, so launch blocker |
| DB-14 | Same account submits repeated pending holds, multi-tab and after clearing browser storage | Server cap enforced; presently no server booking cap, so launch blocker |
| DB-15 | Email sign-in flood across tabs/devices | Server/provider limits and recovery work; 30-second browser timer alone is not protection |
| DB-16 | Legacy expired locks/jobs/outbox while deletion races with new booking | Cleanup never deletes a new/current lock; unresolved delivery retained for review |

## Booking times and mobile flow

| ID | Steps | Expected result / evidence |
|---|---|---|
| BOOK-01 | Select today, yesterday and tomorrow in Belgium time | Today/past denied in UI and server; tomorrow allowed. Pure tests pass; rule integration pending |
| BOOK-02 | Book starts at 09:00 and 19:00 | Both valid; end can extend beyond 19:00. Pure tests pass |
| BOOK-03 | One guest / one bridal / mixed 1–3 people | Sum 60/90 minutes per person; max 270 min; correct €20 each. Pure tests pass |
| BOOK-04 | One-hour appointment at 13:00 | Neighbour at 11:00 or 15:00 permitted, incompatible times blocked. Pure shared-gap tests pass |
| BOOK-05 | Half-hour bridal ending 14:30 | Next hourly start no earlier than 16:00; full hour travel preserved. Pure tests pass |
| BOOK-06 | March/October DST transition and Belgium midnight | Correct local date and UTC locks; no same-day bypass. Pure tests pass |
| BOOK-07 | Change date/time after sign-in | Retain details/session, skip login, update summary, invalidate unavailable slot |
| BOOK-08 | Back/Continue/sign-in/completion on narrow iPhone and Android | Heading/top of form visible; no manual upward scroll; keyboard does not hide action |
| BOOK-09 | Add vacation in admin while customer already on details screen | Date invalidated live or at final server check; no stale submission |
| BOOK-10 | Slow/offline availability, failed fetch, reconnect | Visible loader/error/retry; never pretend an unverified time is available |
| BOOK-11 | Double tap Submit, refresh during email failure | One booking; retry same ID; no duplicate fee instruction or held slot |
| BOOK-12 | Booking saves but client or admin email fails | Truthful held/request status, retry same booking; no false green email success |
| BOOK-13 | Start new booking from completion | Small secondary action resets intake; existing booking remains unchanged and clearly explained |

## Email, files and custom backend

| ID | Attack / failure | Expected result / evidence |
|---|---|---|
| MAIL-01 | Unknown/missing Origin, GET, malformed kind/ID, path traversal | Reject; supported cases automated |
| MAIL-02 | Missing/invalid/expired Firebase token | Reject before sending; invalid/missing mocks pass; live expiry required |
| MAIL-03 | Change submitted recipient/email, booking owner or notification status | Recipient comes only from trusted booking; no unauthorised send. Automated |
| MAIL-04 | Invalid, future or >23h event timestamp | Reject duplicate/retry window bypass. Automated with local fix |
| MAIL-05 | Claim small/no Content-Length but upload >20 MiB stream | Reject 413 before parsing entire body. Automated with local fix |
| MAIL-06 | Non-multipart, malformed boundary, text disguised as image | Reject 400. Automated |
| MAIL-07 | Third photo/person, index outside 0–2, >3 MiB image | Reject; test handler counts plus browser file controls |
| MAIL-08 | Valid PNG/JPEG/WebP with corrupt payload, huge decoded dimensions or EXIF GPS | Reject/re-encode and strip unnecessary metadata; stronger validation pending |
| MAIL-09 | HTML/script in name/address/note; CRLF in subject or ICS text | Escaped/rejected; no extra email headers or calendar event. Automated |
| MAIL-10 | Resend 429/500/timeout after first recipient accepted | Retry without duplicate client mail; admin delivery reconciled; live outage drill pending |
| MAIL-11 | Same idempotency key replay, concurrent retry and >24h retry | Single delivery; do not rely on provider idempotency forever |
| MAIL-12 | Gmail, Outlook, iCloud email light/dark view and attachment open | Legible, correct bank reference/fee/duration, correct .ics import on Apple/Android/desktop |
| MAIL-13 | DEV admin alert link | Opens /chaims-artistry-dev/admin.html when SITE_URL is DEV; local fix tested |
| MAIL-14 | Cloudflare request logs / Resend tracking | No auth token, full request body, photos or unnecessary click/open tracking |
| MAIL-15 | Main key replaced with sending-only key, wrong domain/key/revoked key | Allowed sending succeeds; administrative access impossible; failure handled truthfully |

## Admin, vacation and calendar integration

| ID | Steps | Expected result / evidence |
|---|---|---|
| ADMIN-01 | Search any displayed/nested field across 100 bookings; sort request and appointment dates | Correct filtered count/order and pagination; list logic tests pass |
| ADMIN-02 | Approve/decline twice or from two admin tabs | One valid transition, clear animation; no duplicate customer email or Calendar event |
| ADMIN-03 | Queue reviewed request awaiting payment | Status/ref shown clearly; no approval email until actual approval |
| ADMIN-04 | Calendar creation fails after approval email | UI exposes partial failure and retry; reconciles without second event/email |
| VAC-01 | Single days; continuous 14-day range crossing month/year | Correct inclusive selection, bounded maximum, clear summary. Pure range tests pass |
| VAC-02 | Mobile date fields, desktop side-by-side review, 5+ affected appointments | No overflow/overlap, list scrollable, Review scrolls to affected appointments |
| VAC-03 | Confirm vacation with paid and unpaid requests | Exact affected set; notices once; locks released; refund flagged for manual handling |
| VAC-04 | New request arrives between review and confirm | Included or safely refused; never silently left active |
| VAC-05 | Cancel vacation and cleanup past vacations | Only owned date blocks removed; unrelated vacation blocks remain; unresolved jobs preserved |
| CAL-01 | Approve then move event once, twice rapidly, then cancel | Admin/site/locks follow latest valid state; each applied change email once. Previous controlled live evidence exists; current full regression required |
| CAL-02 | Missing/404 event, unrelated event or edited private tags | No inferred cancellation or unrelated import. Pure tests pass |
| CAL-03 | Move to occupied/vacation/same-day/nonhourly time, resize, all-day or recurring | Reject; admin can see conflict and correct Calendar. Pure tests pass |
| CAL-04 | More than 20 confirmed appointments | Paged scan processes every booking and cycles; no starvation. Discovery tests pass; live volume pending |
| CAL-05 | Email fails after transaction; retry after cancellation | Immutable saved snapshot, stable recipient and idempotency; no misleading stale message |
| CAL-06 | Calendar/Firestore key revoked or API denied | Visible health/error, no speculative cancellation; recover/retry safely |
| CAL-07 | Scheduler overlaps with itself/admin action | Atomic conflict recheck, no overwritten booking/duplicate email; full integration pending |

## Retention, privacy and recovery

| ID | Procedure | Acceptance condition |
|---|---|---|
| DATA-01 | Read privacy notice before entering sign-in, guest details and photos | Correct controller, contact, purposes/bases, transfers, periods, rights, optional images; no forced marketing consent |
| DATA-02 | Inspect network/storage on first load and booking sign-in | Inventory all cookies/localStorage/IndexedDB; no undeclared optional analytics; required disclosures/consent verified |
| DATA-03 | Run 180/90/30-day policy at exact boundary, future/invalid dates, refunds/disputes/legal hold | Safe keep/review decisions; planner has 22 passing checks; real cross-store cleanup still pending |
| DATA-04 | Account access/correction/deletion request incl. multiple guests | Proportionate verification, no other guest leak, locate every copy, one-month response workflow |
| DATA-05 | Delete approved test set with sync paused | Manifest matches, owners/credentials untouched, no orphan locks/events/outbox or cancellation-email flood |
| DATA-06 | Remove appointment/photo after operational expiry | Firestore, Calendar and admin inbox cleaned; provider retention/request documented; minimal accounting archive retained |
| DATA-07 | Restore approved minimal backup into isolated test environment | Booking/lock consistency; restricted access; deletion deadline honoured; no real customer email |
| DATA-08 | Simulate credential leak or data breach | Stop impacted access, rotate via authorised owner, assess/report in required time, document decisions |
| DATA-09 | Remove old staff/calendar sharing/device access | Revoked person cannot read customer data or use old sessions |
| DATA-10 | Final clean launch smoke test | Correct payment instruction, manual admin approval, calendar write/move/cancel, client email and cleanup proved on iPhone + desktop |

## Release record

No open Blocker may be marked as waived just because local tests pass. Record any justified risk acceptance with the owner, mitigation, expiry and follow-up. Only then approve replacing the production coming-soon page with the booking site.
