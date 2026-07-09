# Ownership, Security & Transfer Guide

This document explains **who owns what**, **where the data lives**, **how it's kept safe**,
and **exactly how to hand the whole thing to a new owner** — even someone who doesn't use GitHub.

---

## 1. What makes up this app (the parts you "own")

| Piece | What it is | Where it lives | How it transfers |
|---|---|---|---|
| **Source code** | The whole app (HTML, functions, scripts) | This Git repository (`bau1818/lifm-market-day`) **and** any `.tar.gz` made with `npm run package` | Give someone the repo *or* the archive. No GitHub account required for the archive. |
| **Hosting** | Serves the site + runs the API | Netlify project **lifm-market-day** | Transfer the Netlify project, or the new owner creates their own Netlify site and drops the code in. |
| **Live data** | Vendors, markets, bookings, applications | Netlify **Blobs** store `marketday` (keys `state`, `inbox`, `bk_YYYY-MM-DD`) | Travels with the Netlify project, **or** export/import with the backup file (below). |
| **Uploaded files** | Vendor documents (COI, licenses) | Netlify **Blobs** store `marketdayfiles` | Travels with the Netlify project. |
| **Web address** | `lifm-market-day.netlify.app` | Netlify subdomain | Renames if the project moves; you can also attach a custom domain you own. |

**Source of truth for data = Netlify Blobs on the server.** The browser only holds a working
copy while you use it, so no single phone or laptop is the "master."

---

## 2. The single most important habit: keep your own backups

The app already saves everything to the cloud and snapshots a copy **every day** on the server.
But *you* should also keep copies you personally control. Three ways, easiest first:

1. **In the app** → **To-Do tab → Backup & data → "Download backup (.json)"**.
   Save that file somewhere safe (Drive, Dropbox, email to yourself). Do this weekly.
2. **From any computer** (no logins, just the passcode):
   ```bash
   ADMIN_PASSCODE=market26 node scripts/backup.mjs
   ```
   Writes `market-day-backup-YYYY-MM-DD.json`. You can schedule this (cron / Task Scheduler).
3. **Server daily snapshots** are automatic. To fetch the list or a specific day:
   ```
   GET /api/data?backups            → { backups: ["bk_2026-07-09", ...] }
   GET /api/data?backup=bk_2026-07-09  → that day's snapshot
   ```
   (Both require the `x-passcode` header or `?pass=` — same admin passcode.)

To **restore** a backup file: in the app use **"Restore from a backup file,"** or from a computer:
```bash
ADMIN_PASSCODE=market26 node scripts/restore.mjs market-day-backup-2026-07-09.json
```

---

## 3. Transferring to a new owner

### Option A — Hand over the accounts (simplest, keeps data + files + URL)
1. In **Netlify → Team settings**, add the new owner and transfer the **lifm-market-day** project
   to them (or add them as an admin). This carries the site, the functions, the Blobs data,
   and the uploaded files together.
2. In **GitHub**, transfer the repository to their account/org (Settings → Danger Zone →
   Transfer), or add them as a collaborator.
3. Share the **admin passcode**. Have them change it (see §4).
4. Done — the URL keeps working.

### Option B — Give them a self-contained package (no GitHub needed)
Use this when the new owner just wants the files and will host it themselves.
1. Make the package:
   ```bash
   npm run package        # creates lifm-market-day-YYYY-MM-DD.tar.gz
   ```
2. Make a **data backup** (§2, option 1 or 2) and include the `.json` file.
3. Send them both files. They:
   - Unzip, then either **drag the folder onto app.netlify.com** (Deploys) to get a live site,
     or run it on any static host + serverless platform (see README "Hosting elsewhere").
   - Open their new site, log in, go to **To-Do → Backup & data → Restore** and pick the `.json`.
   - All the vendors, markets, bookings, and applications reappear.

Either way, the new owner ends up with a fully working copy they control, and can hand it
onward the same way.

---

## 4. Security

- **Admin login** is a passcode. Change it by setting **`ADMIN_PASSCODE`** in
  Netlify → Site configuration → Environment variables, then updating the same value in the
  app (see README "Changing the passcode"). The API (`/api/data`, `/api/upload`, `/api/file`)
  **enforces this passcode on every request** — data can't be read or written without it.
- **The public application form** (`/apply.html` → `/api/apply`) is intentionally open so
  anyone can apply; it can only *add* an application to the Inbox, never read or change data.
- **Uploaded documents** are private — they're only served through `/api/file` with the passcode.
- **Transport** is HTTPS (handled by Netlify). Data at rest lives in Netlify Blobs.
- **Recommended:** change the passcode on handover, and after anyone with access leaves.

---

## 5. Account & service inventory (fill in as owners change)

- **GitHub repo:** `bau1818/lifm-market-day`
- **Netlify project:** `lifm-market-day`  ·  site ID `02c25e1d-7279-447c-ac91-9a666f0225c7`
- **Live URL:** https://lifm-market-day.netlify.app
- **Vendor form:** https://lifm-market-day.netlify.app/apply.html
- **Data stores (Netlify Blobs):** `marketday` (app data + daily backups), `marketdayfiles` (uploads)
- **Admin passcode:** stored as `ADMIN_PASSCODE` env var (default `market26` — change it)
