# Google Calendar → booking sync

This separate scheduled Cloudflare Worker complements the booking email Worker, which writes approved appointments to Google Calendar. No public endpoint accepts sync changes.

## Modes and deployment

The checked-in configuration starts disabled. `SYNC_ENABLED=true` enables scheduled processing.

- `SYNC_MODE=dev` processes only `TEST_BOOKING_IDS` (maximum 20), requires `calendarSyncTest: true` on each booking, and restricts recipients to `TEST_RECIPIENTS`.
- `SYNC_MODE=bookings` discovers confirmed bookings automatically. It scans 20 documents per scheduled run, ordered by start time and document ID, and checkpoints its cursor in `calendarSyncHealth/scan`. It includes appointments from the preceding 24 hours onward. A separate query retries pending email outbox entries, including cancelled bookings.

The cron runs once per minute. Larger lists take multiple runs to cycle through. Firestore reads, Worker invocations and Resend delivery count towards their respective quotas. Billing is not enabled by this code.

## Credentials and IAM

Encrypted secrets on `chaims-calendar-sync-dev`:

- `FIRESTORE_SYNC_SERVICE_ACCOUNT`: JSON for `chaims-calendar-sync-data@chaims-artistry.iam.gserviceaccount.com`.
- `GOOGLE_CALENDAR_SERVICE_ACCOUNT`: JSON for `chaims-calendar-sync@chaims-artistry.iam.gserviceaccount.com`, which has access to the CHAIMS Appointments calendar.
- `RESEND_API_KEY`: sending key for the verified domain.

The data account uses the custom role in `firestore-role.yaml`. Automatic discovery additionally requires `datastore.entities.list`. These IAM credentials bypass Firestore client security rules and are project-scoped, not restricted to the collections used by this application. No Authentication administration or billing rights are required. Calendar OAuth access is read-only in this Worker. Keep credentials out of GitHub, website files and chat.

Configure `FIREBASE_PROJECT_ID`, `GOOGLE_CALENDAR_ID`, `FROM_EMAIL`, `ADMIN_EMAIL` and `SITE_URL`. The website and sync currently share the same Firebase project and appointment calendar at the owner's request.

## Verification and behaviour

`SYNC_VALIDATE_ONLY=true` performs a read-only credential check on scheduled invocation, without booking changes or emails. Restore it to false for processing. This check does not verify query permission, database writes or email delivery.

A controlled live test verified a reschedule, cancellation, released locks and delivered customer emails on 27 October 2026. That deployment used the explicit test allowlist. Automatic discovery is a separate rollout: verify successful query logs after granting list permission and deploying the updated Worker.

Move an approved event to a future hourly start between 09:00 and 19:00 Belgium time, keeping its duration unchanged. Guest makeup takes 60 minutes and bridal 90 minutes per person; legacy bookings without a duration retain 180 minutes. Availability maintains one shared hour between appointments. Explicit cancellation releases the booking's locks. A missing/404 event is not interpreted as cancellation.

Unrelated, recurring, all-day, resized, conflicting and vacation-overlapping moves are rejected. Google Calendar cannot prevent the original UI edit; rejected moves require manual correction. Errors are recorded in `calendarSyncErrors`. Arbitrary calendar entries are not imported, and unpaid requests are not approved by this Worker.

Booking changes, locks and email outbox are written together in a Firestore transaction. Emails use a saved appointment snapshot and a stable Resend idempotency key. Unchanged events do not resend emails. Retries older than 23 hours move to review rather than risk sending outside the provider's deduplication window. Inspect `calendarSyncOutbox` and `calendarSyncErrors` when troubleshooting.

Run local checks with `node --test calendar-sync/*.test.mjs *.test.mjs email-worker/*.test.mjs`.

Reference: https://firebase.google.com/docs/firestore/security/iam
