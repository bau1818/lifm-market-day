#!/usr/bin/env node
// Restore a local backup file back into the LIVE Market Day data.
// This OVERWRITES the current shared data for everyone. Take a fresh backup first.
//
// Usage:
//   ADMIN_PASSCODE=market26 node scripts/restore.mjs market-day-backup-2026-07-09.json
//   MARKET_DAY_URL=https://your-site.netlify.app ADMIN_PASSCODE=xxxx node scripts/restore.mjs file.json
import fs from 'node:fs';

const SITE = process.env.MARKET_DAY_URL || 'https://lifm-market-day.netlify.app';
const PASS = process.env.ADMIN_PASSCODE || 'market26';
const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/restore.mjs <backup-file.json>'); process.exit(1); }

let obj;
try { obj = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error(`Could not read/parse ${file}: ${e.message}`); process.exit(1); }

// Accept both the browser export shape ({state, inbox}) and a raw state object ({markets, vendors...}).
const state = obj.state ? obj.state : (obj.markets ? obj : null);
const inbox = Array.isArray(obj.inbox) ? obj.inbox : [];
if (!state || !Array.isArray(state.vendors)) { console.error('That file is not a Market Day backup.'); process.exit(1); }

const res = await fetch(`${SITE}/api/data`, {
  method: 'POST',
  headers: { 'x-passcode': PASS, 'content-type': 'application/json' },
  body: JSON.stringify({ state, inbox })
});
if (!res.ok) { console.error(`Restore failed: HTTP ${res.status} — ${await res.text()}`); process.exit(1); }
console.log(`Restored ${state.vendors.length} vendors and ${inbox.length} applications to ${SITE}.`);
