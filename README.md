# CHAIMS Artistry — DEV

Development repository. Changes are reviewed here first; production repository `waseem2170/chaims-artistry` is updated only after explicit approval.

GitHub Pages: serve main / root. Relative website assets support the /chaims-artistry-dev/ project path. DEV uses the current Firebase project at the user’s request: bookings affect real availability and emails. Add waseem2170.github.io to Firebase authorised domains, reCAPTCHA hostnames and the Worker origin allowlist before testing. The DEV URL path is /chaims-artistry-dev/. No automatic publishing to production is configured.

The Firebase web config is public application configuration, not a server credential. Worker secrets remain encrypted in Cloudflare; no credentials, private email previews, customer data, test harnesses or local screenshots belong here. Do not upload service-account JSON.

The current worker includes the user-provided copy revision. Deploying this repository does not deploy the Cloudflare worker or Firebase rules. Calendar connection is not yet live-tested. App Check is initialized but backend enforcement remains pending.

Run checks: `node --test *.test.mjs email-worker/*.test.mjs`.
