# DEV update — 25 October 2026

Implemented: refreshed admin login and compact cards, search and pagination, strict 30-minute admin session, vacation multi-select/range with review and cancellation retry, grouped booking form, email-first sign-in, progress bar, account tile, readable errors, preparation link, logo alignment, availability timeout/retry.

Firestore vacation rules published. Worker 75520680 deployed with appointment-only calendar events and confirmation Google Calendar link; preserves website buffer and removes legacy break when synchronising an appointment. Existing historical breaks are not mass-deleted.

DEV uses the current Firebase project by request. DEV hostname allowed in Firebase, reCAPTCHA and Worker. Website publishes only to DEV repository.

Firebase default sign-in email retained by user choice; branded sign-in backend and extra service account are deferred. Client resend countdown is not server rate limiting. Invisible reCAPTCHA/App Check runs before booking submission; backend enforcement still needs validation before production launch.

Vacation cancellation is initiated by the admin after reviewing affected appointments. Dates remain blocked if notification fails; retry from Saved vacations. Keep the page open until completion. Automatic refunds are not performed. Worker notification retries are limited to 23 hours; older failures require manual follow-up.

No real appointments were cancelled or emails sent during this update. Calendar live connection and full vacation cancellation flow still need a controlled end-to-end test. Data-retention policy remains undecided. Two-way Google Calendar busy-time import is not part of this version.
