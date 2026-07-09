#!/usr/bin/env node
// Bundle the whole project into a single portable archive (excludes node_modules and .git),
// so it can be handed to a new owner on a USB stick or by email and hosted anywhere.
//
// Usage: node scripts/package.mjs [outfile.tar.gz]
import { execSync } from 'node:child_process';

const stamp = new Date().toISOString().slice(0, 10);
const out = process.argv[2] || `lifm-market-day-${stamp}.tar.gz`;
execSync(
  `tar --exclude=node_modules --exclude=.git --exclude='*.tar.gz' -czf "${out}" .`,
  { stdio: 'inherit' }
);
console.log(`Created ${out} — drag this onto app.netlify.com (or unzip and host anywhere).`);
