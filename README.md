# Market Day — Long Island Farmers Markets (G&G)

Admin dashboard + public vendor application form. One shared copy of the data,
synced through Netlify. Rebranded to the G&G tractor logo.

## What's inside
- `public/index.html` — the admin app (passcode-gated)
- `public/apply.html` — the public vendor application form (NO passcode)
- `public/logo.png`, `public/logo-sm.png` — the brand logo
- `netlify/functions/data.js` — shared data store (requires the admin passcode)
- `netlify/functions/apply.js` — receives applications (public, open to anyone)
- `netlify.toml` — build config

## Passcodes / links
- **Admin passcode:** `market26`  (checked in-browser — no server dependency, cannot be blocked by the network)
- **Admin app:**  https://lifm-market-day.netlify.app
- **Vendor form:** https://lifm-market-day.netlify.app/apply.html  ← share this; no passcode

## Deploy
Drag-and-drop this whole folder (or the zip) onto
app.netlify.com → project **lifm-market-day** → **Deploys**.

## Optional: email me when someone applies
In Netlify → Site configuration → Environment variables, add:
- `RESEND_API_KEY` — a free key from resend.com
- `NOTIFY_EMAIL` — the address to notify
If these aren't set, applications still arrive in the app's **Inbox** tab — you just won't get an email.
