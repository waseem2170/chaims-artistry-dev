# DEV calendar sync — disabled until configured

This is a separate scheduled Cloudflare Worker, not a replacement for the email Worker.
It polls explicitly allowlisted booking event IDs once per minute. No public endpoint accepts changes.
Production mode is intentionally rejected. No live tests have been performed.

## Access preparation

1. In project `chaims-artistry`, create service account `chaims-calendar-sync-data`.
2. Create a custom IAM role using `firestore-role.yaml` and assign it to that account. Do not grant Owner, Editor, Firebase Admin, or Authentication permissions.
3. Store its JSON credential directly as the encrypted Worker secret `FIRESTORE_SYNC_SERVICE_ACCOUNT`. Do not paste it into GitHub, browser code, or chat.
4. Keep the existing calendar service account's access unchanged. Its JSON goes into `GOOGLE_CALENDAR_SERVICE_ACCOUNT` on this separate Worker. This Worker requests a read-only Calendar OAuth scope.
5. Configure `RESEND_API_KEY` as a secret. Configure `GOOGLE_CALENDAR_ID`, `FROM_EMAIL`, `ADMIN_EMAIL`, and `SITE_URL` for the test setup.
6. Deploy with the included Wrangler configuration; leave `SYNC_ENABLED=false` initially.

IAM database credentials bypass Firestore client rules and are not collection-scoped. The custom role omits listing and administrative operations, but can read/write known document paths in its granted scope. The application allowlists are additional safeguards, not IAM isolation. Use a separate database/project before any broader rollout if stronger isolation is required. The current shared Firebase project is retained as requested.

## Controlled test

Create only clearly labelled test bookings in DEV. Mark them `calendarSyncTest: true` in the console, list their IDs in `TEST_BOOKING_IDS`, and list their test email addresses in `TEST_RECIPIENTS`. Empty allowlists fail closed. Maximum 20 IDs.

After credentials are configured, enable `SYNC_ENABLED=true` for the test. Move a test event by a whole hour on a future date (09:00–19:00 Belgium time), preserving its three-hour duration. Verify the new four-hour lock, old lock release, updated admin view, and one customer email. Delete a second test event and verify cancellation, released locks and one email. Test a conflicting move and a vacation date: the website booking must remain unchanged, with an entry in `calendarSyncErrors`. Google Calendar cannot prevent the original UI edit: invalid calendar changes currently require manual correction; automatic reversal is not implemented.

Unrelated, all-day and recurring events are rejected. Missing/404 events are not treated as cancellations; explicit cancelled status is required. Existing website bookings are not imported from arbitrary Calendar entries. Previous unpaid requests are not auto-approved.

The transaction writes the booking, locks and email outbox together. Pending emails are retried with a stable Resend idempotency key. Retries stop after 23 hours to avoid duplicate delivery beyond the provider's deduplication window. Inspect `calendarSyncOutbox` and `calendarSyncErrors` if delivery fails. Repeated schedules cannot apply the same booking state twice. No email is sent for rejected moves.

Disable the Worker and remove test appointments after the end-to-end test. Do not enable this on real customer bookings yet. Local tests cover validation and orchestration; deployment credentials, real Firestore transactions, Calendar cancellation semantics and real email delivery still require the controlled integration test.

Reference: https://firebase.google.com/docs/firestore/security/iam
