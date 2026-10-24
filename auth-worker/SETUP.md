# Protected email sign-in — prepared approach, not activated

Keep Firebase Google sign-in. Email links are passwordless sign-in, not a second factor.

## Delivery and identity
- Dedicated `chaims-auth-email` Worker; a separate service account with a custom role containing only `firebaseauth.users.sendEmail`, scoped to chaims-artistry. Do not expand the Calendar service account.
- Generate EMAIL_SIGNIN links using accounts:sendOobCode with returnOobLink:true and targetProjectId; OAuth credentials stay encrypted in the Worker.
- Send a neutral branded template through Resend, from CHAIMS Artistry <noreply@chaimsartistry.com>. Never expose action links, OAuth tokens, service keys or recipient addresses in logs.
- Fixed allowlisted return URLs for production and DEV. DEV shares current Firebase only at the user's explicit request.
- Keep Firebase email-enumeration protection on and never report whether an account exists.

## Abuse controls
- 60-second resend countdown in the browser (implemented; this is UX only).
- Managed Turnstile challenge, checked server-side with Siteverify. Validate success, exact expected hostname and action `email_signin`. Single-use tokens expire after five minutes.
- Atomic rate counters in a SQLite Durable Object: 60-second minimum interval and max 5 sends/day per normalized email; max 20 attempts/hour per Cloudflare-provided source IP; global daily cap below Resend allowance. Count failed provider attempts too. Return Retry-After for throttling.
- HMAC email/IP identifiers using an encrypted secret; counters expire after their window. Do not retain raw addresses/IPs in counters.
- Fail closed on CAPTCHA, counter-storage or token-generation failure. Never fall back to direct unprotected sending after activating this path.
- IMPORTANT: protecting this custom endpoint does not by itself block direct requests to Firebase's public email-send endpoint. Evaluate and enforce Firebase Authentication App Check / supported reCAPTCHA protection for this project's configuration before claiming end-to-end abuse protection. Test direct bypass attempts; if enforcement cannot cover email-link sending without billing, disclose that limitation and keep the Firebase sending quota as a final bound.

## Required before activation
1. Explicit access approval for the dedicated identity and permission above; user creates/enters its credential directly into Cloudflare.
2. Turnstile site + encrypted secret and allowed hostnames; no CAPTCHA solved by automation without approval.
3. Durable Object binding/migration, verified Resend sender, fixed return URL allowlist.
4. Verify quotas and no-billing status. SQLite Durable Objects support Workers Free; free limits fail requests instead of charging.
5. Test CAPTCHA rejection/replay, spoofed origin/hostname/action, concurrent rate requests, API bypass, email rendering, link expiry and sign-in on another device.
6. Only then switch the frontend from Firebase's default sender. Sender/template remains Firebase's default until activation.

Reference: https://firebase.google.com/docs/auth/admin/email-action-links
https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/sendOobCode
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
https://developers.cloudflare.com/durable-objects/platform/pricing/
