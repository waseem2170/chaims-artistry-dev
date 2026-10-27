# CHAIMS Artistry — go-live audit

Audit date: 27 October 2026 (Europe/Brussels). **Decision: do not open public booking yet.** The production domain currently remains a coming-soon page. DEV and the backend share one Firebase project and appointment calendar.

## Evidence and limits

- 94 automated checks passed: existing scheduling/admin/calendar tests plus 33 email/security checks and 22 retention checks. Command: `node --test calendar-sync/*.test.mjs *.test.mjs email-worker/*.test.mjs prelaunch/*.test.mjs`.
- The new mail tests execute the real Worker handler with simulated Firebase/Resend responses. They do not prove Firebase token validation, live provider delivery or deployed rules themselves.
- Three read-only Firebase Rules Playground simulations against the published rules denied anonymous GETs of a booking, an owner record and a sync outbox record. No customer data was modified.
- Published rules inspected: verified identity; customer ownership; Google-only admin; admin auth_time less than 30 minutes; default deny for unspecified collections. A refreshed token does not extend original admin auth_time.
- Live Firebase App Check: Firestore **Monitoring**, Authentication **Monitoring**. This is not enforcement. Snapshot showed 18% and 42% unverified requests respectively; these percentages are not evidence of malicious users.
- Live database location: **europe-west1**. This does not imply every processor or Firebase product stores data in Europe.
- Live Cloudflare email Worker: sensitive API/calendar credentials encrypted; allowed origins include production, localhost and GitHub DEV; no database/storage binding. It reads Firestore using the caller's Firebase token. Logs persisted, invocation logs enabled.
- Live Resend: domain verified; Ireland sending region; calendar key sending-only; main `CHAIMS` key full access; TLS Opportunistic. Tracking not shown as configured; verify the tracking detail screen before sign-off.
- Firestore emulator tests were **not run**: this workspace has no Java runtime. Authenticated rule denial, forged writes, transactions and concurrency remain explicit launch gates, not claimed passes.
- No penetration test, load test, MFA audit, dependency-history secret scan, disaster recovery drill or legal certification has been completed by this report.

## Findings and required actions

| Priority | Finding | Required result before booking launch | Status |
|---|---|---|---|
| Blocker | App Check is monitoring only; Worker forwards the header without independently verifying it | Enable and test enforcement for supported Firebase services; verify missing/invalid tokens are rejected through REST and SDK; independently verify App Check at the custom Worker boundary or document/test how enforced Firestore reads protect every action | Open; do not simply toggle before regression testing |
| Blocker | A signed-in verified user can create multiple unpaid holds; browser resend countdown is bypassable | Server-enforced booking/email abuse limits and an agreed unpaid-hold expiry/review process; test limits across tabs/devices and concurrency | Open |
| Blocker | No published privacy notice or rights/deletion process linked at data collection | Complete business identity, processing purposes, legal bases, data locations/transfers, retention, recipients, rights and contact; link before sign-in, photo upload and submit | Open |
| Blocker | Approved retention periods are not enforced across stores | Implement controlled cleanup for Firestore, Calendar, inbox and snapshots; preserve accounting records/disputes/refunds; prove deletion and exception tests | Planner/tests prepared; deletion automation not active |
| High | Main Resend key is Full access | Replace with domain-scoped sending-only key, enter directly into Cloudflare, test, then revoke old key after checking consumers | Not changed |
| High | Opportunity for unencrypted final email delivery under Opportunistic TLS | Choose Enforced TLS and test intended recipient providers; handle rejected deliveries without false success messages | Not changed |
| High | Secrets are long-lived service-account JSON keys | Review active key inventory, remove unused keys after matching Worker consumers, confirm account MFA/recovery and restricted dashboard membership | Not fully reviewed |
| High | Database service account bypasses client rules and can access project-wide documents | Keep custom minimal IAM role; no Owner/Editor/Auth admin; review collection isolation or stronger architecture before broader access | Code role reviewed; live complete IAM membership review pending |
| High | New booking rules allow omitted durationMinutes through a legacy fallback | Require a computed duration on every new booking while retaining compatibility for reading old records; verify rejection in emulator | Open |
| High | No authenticated Firestore emulator/concurrency evidence | Execute the matrix in TEST-CASES.md, including 30-minute boundary and atomic competing bookings | Pending |
| High | External processors and consumer Gmail handling not contractually verified | Record Google/Firebase, Cloudflare, Resend, calendar and mailbox terms/DPA and international-transfer safeguards; confirm the chosen mailbox terms are appropriate for customer data | Pending |
| Medium | Original request relied on Content-Length only for upload cap | Read and cap actual stream; reject malformed multipart | Fixed locally and tested; not deployed |
| Medium | Invalid/future notification timestamps could pass retry guard | Require a finite, non-future timestamp inside 23-hour window | Fixed locally and tested; not deployed |
| Medium | DEV admin email link could lose repository path | Resolve admin.html relative to the configured site base | Fixed locally and tested; not deployed; live SITE_URL currently production |
| Medium | CORS includes DEV and localhost in shared service | Remove development origins at launch or separate deployments; CORS is not authentication and GitHub Pages origin is shared across repositories | Open |
| Medium | Outbox saves full customer snapshots indefinitely | Delete delivered snapshots after 7 days; unresolved entries need review, not silent deletion | Approved period; not automated |
| Medium | Public availability documents expose booking IDs and closed-date metadata | Keep these documents free of customer names/contact data; test public field shape; consider a public availability projection without booking references | Reviewed code; emulator assertion pending |
| Medium | Images only get a signature check; no decoding/re-encoding/malware validation | Test corrupt files and decompression bombs; consider re-encoding/metadata stripping, particularly EXIF location; never render untrusted HTML/SVG | Partial controls; stronger validation pending |
| Medium | Calendar edit can be rejected by website conflict rules | Clear admin alert and correction procedure for conflicts/vacations; do not tell customer reschedule succeeded until applied | Local validation tests pass; live failure drill pending |
| Medium | Website booking approval and email/calendar writes are separate operations | Test partial failures/retries, truthful UI, reconciliation and no duplicates; add durable state for user-triggered notifications if needed | Some retry tests exist; full outage drill pending |

## Changes prepared during this audit

`email-worker/security.mjs` caps streamed multipart input at 20 MiB, rejects malformed input, and validates the notification window. The handler now uses it, adds no-store/nosniff response headers and resolves the admin URL relative to the site base. Custom email wording is retained.

`prelaunch/retention-plan.mjs` is **read-only**. It returns keep/review decisions, preserves legal/refund/dispute holds, and never deletes records. It is a starting point for the approved policy, not a deployed scheduler.

## Cleanup inventory

Read-only UI inventory observed 43 booking documents, 5 calendar sync outbox documents, 7 vacation jobs, 65 legacy scheduleDays documents, 1 sync checkpoint and 2 owner/admin records. A separate private manifest contains document IDs; do not publish it in GitHub. Root collection enumeration did not show timeLocks at inspection. Recheck immediately before cleanup; do not infer that no locks can be created later.

The pre-launch test cleanup must pause scheduled sync, reconcile/remove corresponding owned Calendar test events without sending cancellation emails, delete confirmed test booking/lock/outbox/vacation/legacy entries, keep admin records and credentials, clear browser test sign-ins, and perform a final clean booking test. Any export used for rollback is itself personal data and needs restricted access and a short deletion date. Deleting Firestore alone does not remove Calendar, mailbox or Resend copies.

No test data has been deleted by this audit. Permanent deletion requires the separately requested approval and a final scope check.

## Sign-off gates

- [ ] Owner/business details and privacy notice approved.
- [ ] Processor/transfer register and mailbox arrangement reviewed.
- [ ] Retention cleanup enabled and verified; accounting exceptions confirmed by accountant.
- [ ] CAPTCHA enforcement + server abuse limits verified.
- [ ] Restricted Resend key and TLS decision applied and delivery retested.
- [ ] Owner MFA/recovery, active keys and calendar sharing checked.
- [ ] Authenticated Firestore rule and concurrency suite passes.
- [ ] All required mobile and end-to-end cases pass with evidence.
- [ ] Test data cleaned across all stores, followed by one final smoke test.
- [ ] Recovery/rollback, breach response and data-subject request runbooks assigned to Chaima.
- [ ] Full booking release explicitly approved; coming-soon page replaced only then.

## Sources checked on audit date

- EDPB data protection basics: https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en
- EDPB compliance/records: https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en
- EDPB rights: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
- Belgian DPA cookies: https://www.autoriteprotectiondonnees.be/professionnel/themes/internet/cookies
- Firebase privacy and data locations: https://firebase.google.com/support/privacy
- Firestore IAM: https://firebase.google.com/docs/firestore/security/iam
- Resend GDPR, storage and retention: https://resend.com/security/gdpr
- Resend DPA: https://resend.com/legal/dpa
- Cloudflare Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/

Providers and legal requirements change; recheck at actual launch. GDPR does not prescribe a single universal retention period. The selected operational periods do not determine accounting retention. Current Belgian official invoice pages contain differing 7/10-year statements, so obtain the applicable period from the accountant before deleting supporting payment evidence; do not retain photographs for that accounting purpose.
