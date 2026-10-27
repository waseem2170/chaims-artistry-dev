# Data protection and retention record

Owner approval on 27 October 2026: **180 days after completed appointments; 90 days after cancellation/refund resolution; inspiration photos in the admin inbox removed within 30 days after the appointment**. These are operational periods, not statutory accounting periods. Implementation remains a launch gate.

## Data map / record of processing

Controller: CHAIMS Artistry / Chaima Zarka. **Confirm full legal entity/trading identity, registered/contact address and enterprise number before publication.** Privacy contact proposed: chaimsartistry@gmail.com. Do not publish unverified business details.

| Processing | Data | Purpose / proposed legal basis | Recipients and storage | Retention / action |
|---|---|---|---|---|
| Sign-in | UID, email, Google profile/display name, login/security metadata | Identify booker; steps to enter/perform booking contract, proportionate security interests | Firebase Authentication, browser auth persistence; Authentication operates from US centres per Firebase documentation | Account inactivity/deletion policy still needs a decision; proposed annual review, no automatic deletion yet |
| Appointment request | Booker/guest names, makeup choices, email, phone, one visit address, time, note, reservation acknowledgement | Arrange and perform requested service; Article 6(1)(b) for booker, assess necessary guest handling/transparency | Firestore europe-west1; authorised admin; Cloudflare processing; email/Calendar copies | 180 days after completed visit; cancelled 90 days after cancellation/refund resolution; legally required evidence separated |
| Unpaid holds | Above booking data and hourly locks | Arrange request and avoid double booking | Firestore and admin | Review aged unpaid holds; expiry and payment deadline need business approval. Do not keep blocked slots forever |
| Inspiration images | Up to 2/person, optional; may include faces/EXIF | Create requested look; no marketing/model training or facial identification | Browser memory → Cloudflare → Resend → admin inbox; not stored in Firestore | Admin inbox delete within 30 days after appointment; Resend provider window currently 30 days from sending plus provider backups; explain both |
| Notifications | Recipient, full appointment content, delivery metadata, image attachments to admin | Payment instructions, confirmation, cancellation/reschedule; service communications | Resend, sender/recipient inboxes | Provider currently 30 days on Free/Pro/Scale, backups 7 days; individual early removal via provider request. Keep admin operational emails only for booking period; preserve necessary finance evidence separately |
| Calendar | Name, appointment date/time/address; current code also includes email, phone, guests and notes | Schedule visit; check which fields are necessary for travelling admin | Private CHAIMS Appointments Google Calendar; two scoped service accounts in Workers | Remove operational event after 180 days after appointment, or 90 days after cancellation/refund resolution; include shared/device copies in access review |
| Sync outbox | Booking snapshot and delivery status | Reliable email retries | Firestore, service account | Delivered snapshot: 7 days proposed; pending/failed entries reviewed and resolved; minimal audit metadata only if justified |
| Security/operations | Request invocation metadata, minimal error messages and booking IDs | Security, troubleshooting, service reliability; legitimate interests assessment | Cloudflare logs; Firestore error collection | Workers Free currently 3 days (Paid 7); Firestore errors proposed 30 days; no tokens, request bodies, full addresses or photos in logs |
| Vacation | Dates and affected booking IDs | Availability and cancellation workflow | Firestore/admin | Remove past complete/removed jobs after notices finish; existing cleanup currently runs on admin list load, not a guaranteed daily scheduler |
| Financial records | Minimal invoice/payment/refund evidence | Applicable Belgian legal obligations | Restricted accounting archive/bank/accountant | Accountant to confirm exact statutory period and exceptions; not the whole beauty intake or inspiration images |

Photos are not automatically biometric special-category data just because they show a face. Do not perform identification or collect health information through open notes. If health/allergy information becomes necessary, design a separate explicit, limited process and appropriate legal basis before collecting it.

## Privacy notice — content to approve before publication

Tell users who the controller is and how to contact it; why sign-in, customer/guest names, address, phone, service details and optional images are needed; legal bases; mandatory/optional fields; processors and authorised admin access; US/global processing and safeguards; the approved periods and accounting exceptions; security storage/cookies; access/correction/deletion/restriction/objection/portability and complaint rights; no marketing without a separate opt-in; and no automated eligibility decisions.

Provide notice before sign-in and submission, and at optional image upload. A reservation-policy checkbox is not a general GDPR consent. Necessary booking processing should not rely on forced consent. Give bookers an easy way to share the notice with the other guests whose information they supply; assess Article 14 obligations for indirectly collected guest data.

A privacy page alone is not compliance: the stated deletion and rights processes must actually work.

## Processor / transfer checks

- Firebase: archive applicable Data Processing and Security Terms / Google Cloud DPA; confirm region and current subprocessors. Auth is US-based even with European Firestore.
- Cloudflare: archive applicable DPA and transfer safeguards; Workers execute across Cloudflare infrastructure. Confirm account plan/logs and membership; do not claim EU-only execution.
- Resend: DPA currently applies with account signup; download the executed copy. Stored email data is in the US even when sending via Ireland; record SCCs/DPF mechanism and transfer assessment. Review subprocessors. Disable optional open/click tracking unless separately justified and disclosed.
- Google Calendar / Gmail: verify applicable terms, privacy roles and business-data handling for the actual accounts. A free personal mailbox is not automatically a verified processor arrangement. No business-plan purchase is authorised by this audit.
- GitHub Pages: publicly hosts site source and static assets. No credentials, customer exports or cleanup manifests in repository/history. DEV's shared project is deliberate but must be access/release controlled before real customers.

## Access, correction and deletion requests

1. Log request date, category and response deadline without copying unnecessary content. Normally respond within one month; explain any lawful extension within that period.
2. Verify requester proportionately; do not routinely demand an ID scan. Avoid exposing another guest's data in a booker's export.
3. Search UID/email/reference across Auth, bookings, locks, outbox snapshots/errors, private Calendar, admin mailbox/attachments and provider delivery records.
4. Rectify or supply an appropriate portable copy; assess deletion against unresolved appointments, refunds, disputes and legal accounting obligations.
5. Delete/anonymise operational copies and instruct relevant processors where needed; restrict legally retained finance records rather than falsely promising complete erasure.
6. Record completion and expiry of any necessary minimal request log. Customer inbox copies and saved calendar imports are controlled by the recipient; communicate that limit accurately.

## Incident / breach runbook

Restrict access or stop affected Worker; preserve minimal evidence; identify which data/people were affected; contain/revoke exposed credentials through the authorised user; assess risk and document decisions. Notify the competent authority within 72 hours of awareness when required under GDPR, and affected people without undue delay when high risk requires it. Record incidents even when notification is not required. Prepare Chaima's incident contact and Belgian DPA reporting route before launch.

## Cleanup safeguards

The retention planner only proposes review; no deletion is scheduled. A real cleanup job must have a dry-run, exact document manifest, dependency order, race protection, legal/refund holds, failure/retry logging without PII, proof that images/calendar/inbox copies were handled, and a bounded backup/export expiry. Never implement blind TTL on bookings while leaving orphaned locks, events or pending emails.
