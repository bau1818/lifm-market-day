# Market Day — Long Island Farmers Markets (G&G)

Admin dashboard + public vendor application form for running Long Island farmers markets.
One shared copy of the data, synced live through Netlify.

- **Admin app:** https://lifm-market-day.netlify.app  (passcode-gated)
- **Vendor form:** https://lifm-market-day.netlify.app/apply.html  ← share this; no passcode

> **New owner?** See **[OWNERSHIP.md](OWNERSHIP.md)** for how to back up, transfer, and secure the app.

---

## How this app works (architecture)

It's a small, self-contained app with three layers, all hosted on Netlify:

```
   Phone / laptop browser
   ┌─────────────────────────────┐
   │  public/index.html  (admin)  │   ← the whole admin UI is one HTML file (HTML+CSS+JS)
   │  public/apply.html  (public) │   ← the public application form
   └──────────────┬──────────────┘
                  │  fetch() over HTTPS
                  ▼
   Netlify Functions (serverless API, in netlify/functions/)
   ┌─────────────────────────────┐
   │ data.js   /api/data   read/write app data (passcode-gated) │
   │ apply.js  /api/apply  receive a public application (open)   │
   │ upload.js /api/upload store a vendor file (passcode-gated)  │
   │ file.js   /api/file   serve a vendor file (passcode-gated)  │
   └──────────────┬──────────────┘
                  │
                  ▼
   Netlify Blobs (the database)
   ┌─────────────────────────────┐
   │ store "marketday":                                        │
   │   • "state"  → markets, vendors, bookings, todos, music   │
   │   • "inbox"  → vendor applications                        │
   │   • "bk_YYYY-MM-DD" → automatic daily backup snapshots    │
   │ store "marketdayfiles":                                   │
   │   • uploaded vendor documents (COI, licenses, …)          │
   └─────────────────────────────┘
```

**What lives where**
- **`public/index.html`** — the entire admin app (UI, logic, and the starting/seed data) in one file.
- **`public/apply.html`** — the public vendor application form.
- **`public/logo.png`, `logo-sm.png`** — the G&G brand logo.
- **`netlify/functions/*.js`** — the serverless API (see the diagram).
- **`scripts/*.mjs`** — command-line backup / restore / packaging tools.
- **`netlify.toml`** — tells Netlify to publish `public/` and where the functions are.

**Where the data is saved / source of truth**
- The **source of truth is Netlify Blobs** (server-side). Everything you change is written there.
- The browser holds a **working copy** only while open. `localStorage` stores just the passcode,
  not your data — so no single device is the "master" and nothing is lost if a phone breaks.

**How real-time sync works (the "1 PM / 2 PM" requirement)**
- Every change in the admin app is saved to the server immediately (with retry if offline).
- Every open admin screen **re-reads the server every 5 seconds**, and again whenever the tab
  regains focus. So if Person A adds a vendor on their phone, Person B's computer shows it within
  seconds — across devices, browsers, operating systems, and locations. (It's careful not to
  overwrite unsaved local edits or interrupt typing while syncing.)

**How backups work**
- The server writes a **daily snapshot** (`bk_YYYY-MM-DD`) on every save — automatic point-in-time backups.
- You can also **download a full backup** anytime (To-Do tab → Backup & data), or from the
  command line with `npm run backup`. See [OWNERSHIP.md](OWNERSHIP.md) §2.

---

## Security

- The admin API enforces the **admin passcode** on every read and write. Without it, the data
  can't be read or changed. Uploaded vendor files are private (served only with the passcode).
- The public application form can only **add** an application to the Inbox — it can't read or edit data.
- All traffic is HTTPS. See [OWNERSHIP.md](OWNERSHIP.md) §4 for the full rundown.

### Changing the passcode
1. In **Netlify → Site configuration → Environment variables**, set `ADMIN_PASSCODE` to the new value.
2. In `public/index.html`, update the `PASSCODE` constant (near the top of the script) to match,
   and in `public/apply.html` nothing changes (the form is public). Commit and redeploy.
   > The API reads `ADMIN_PASSCODE`; the browser gate reads the `PASSCODE` constant. Keep them equal.

---

## Backup, restore & packaging (command line)

Requires Node 18+. Set `ADMIN_PASSCODE` (and `MARKET_DAY_URL` if not the default site).

```bash
npm run backup        # download live data → market-day-backup-YYYY-MM-DD.json
npm run restore -- market-day-backup-2026-07-09.json   # push a backup file back to the live site
npm run package       # bundle the whole project → lifm-market-day-YYYY-MM-DD.tar.gz (no GitHub needed)
```

---

## Deploy

Drag-and-drop this whole folder (or the `.tar.gz` from `npm run package`) onto
**app.netlify.com → project lifm-market-day → Deploys**. Netlify builds the functions and
publishes `public/` automatically.

### Environment variables (Netlify → Site configuration → Environment variables)
See `.env.example`. The important one:
- **`ADMIN_PASSCODE`** — the admin login passcode (defaults to `market26` if unset — change it).
- Optional: `NETLIFY_BLOBS_TOKEN` (only if Blobs auto-config is unavailable),
  `RESEND_API_KEY` / `NOTIFY_EMAIL` (application email notifications, if enabled).

### Hosting elsewhere
The front end is plain static HTML — host `public/` on any static host. The four API endpoints
are standard serverless functions; they use Netlify Blobs for storage. To move off Netlify,
re-implement the same four `/api/*` routes against any key-value store (the shapes are documented
in each function file) and point the front end at them.

---

## Vendor categories

Vendors are tagged with one **vendor category**. The current set (edit `CATS` in `public/index.html`
and the `<select>` in `public/apply.html` to change them):

Farm/Produce · Meat/Poultry/Seafood · Bakery · Dairy & Cheese · Coffee/Tea/Beverage ·
Pantry/Specialty Foods · Prepared Foods · Sweet Treats · Health & Wellness · Pet Products ·
Handcrafted Goods · Beauty Products · Food Truck · Plants & Garden

Older data used a smaller set; it's migrated to the new categories automatically on load, so
nothing breaks.
