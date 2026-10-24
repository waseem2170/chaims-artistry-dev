# Review queue — 24 October 2026

- Preserve user-supplied worker wording as baseline.
- Admin: shared branding on login/dashboard, top-right account dropdown, feedback within booking cards, loading indicators for actions, no reviewed/queued banner.
- Enforce and test strict 30-minute admin expiry including resumed tabs and server rejection.
- Google Calendar: appointment only; preserve one-hour website buffer. Remove historical break event when resyncing.
- Confirmation email: add-to-calendar link plus ICS option. Decline subject/heading wording awaiting clarification.
- Booking: remove decorative makeup from appointment section, hide fields until signed in, show signed-in identity as text, heading Your booking details, first person follows booker name until edited, centered reservation checkbox.
- Email sign-in security requires consultation: server-verified CAPTCHA, per-email/IP limits, resend countdown, branded Resend messages; separate minimal authentication permission, never reuse calendar identity.
- Data retention policy awaits decision; cover Firestore, Calendar, emails and attachments, preserve legally required accounting records separately.
- DEV backend choice pending. GitHub Pages currently design-only; no production Firebase actions there.
- Vacation periods remain a later nice-to-have.

No live calendar test booking was created before this scope change.

## Implemented locally after consultation
- Admin branding/account menu, card feedback/loaders, immediate UI lock at expiry plus focus/15-second checks. Server 30-minute rule remains in firestore.rules.
- Booking form hidden until sign-in, identity text, first-person autofill, centered consent, appointment artwork removed.
- Worker retains user wording; confirmation adds Google Calendar link; appointment-only sync removes legacy break event. Website buffer unchanged.
- Decline wording retained as An update on your appointment.
- User selected current Firebase for DEV. Authentication/Worker origin allowlists still need configuration.
- Email sign-in server protection prepared in auth-worker/SETUP.md, not activated. Client resend countdown is not server protection.
