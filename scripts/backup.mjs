#!/usr/bin/env node
// Pull a full backup of the LIVE Market Day data to a local file.
// This works from any computer with Node 18+ — no GitHub or Netlify login needed,
// just the admin passcode. Great for scheduled/off-site backups.
//
// Usage:
//   ADMIN_PASSCODE=market26 node scripts/backup.mjs [outfile.json]
//   MARKET_DAY_URL=https://your-site.netlify.app ADMIN_PASSCODE=xxxx node scripts/backup.mjs
import fs from 'node:fs';

const SITE = process.env.MARKET_DAY_URL || 'https://lifm-market-day.netlify.app';
const PASS = process.env.ADMIN_PASSCODE || 'market26';
const stamp = new Date().toISOString().slice(0, 10);
const out = process.argv[2] || `market-day-backup-${stamp}.json`;

const res = await fetch(`${SITE}/api/data`, { headers: { 'x-passcode': PASS } });
if (!res.ok) {
  console.error(`Backup failed: HTTP ${res.status} — ${await res.text()}`);
  console.error('Check MARKET_DAY_URL and ADMIN_PASSCODE.');
  process.exit(1);
}
const data = await res.json();
const payload = { app: 'lifm-market-day', exportedAt: new Date().toISOString(), state: data.state, inbox: data.inbox || [] };
fs.writeFileSync(out, JSON.stringify(payload, null, 2));
const vendors = (data.state && Array.isArray(data.state.vendors)) ? data.state.vendors.length : 0;
console.log(`Saved backup to ${out}  (${vendors} vendors, ${(data.inbox || []).length} applications)`);
