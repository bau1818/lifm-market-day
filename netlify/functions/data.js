// netlify/functions/data.js — shared data store for the admin app.
// - Requires the admin passcode (header "x-passcode" or ?pass=) on every request.
// - Reads/writes the live state + inbox from Netlify Blobs.
// - Writes an automatic daily backup snapshot on every save (retrievable via ?backups / ?backup=KEY).
var STORE_NAME = "marketday";
var STATE_KEY = "state";
var INBOX_KEY = "inbox";
var BK_PREFIX = "bk_";          // daily backup snapshots: bk_YYYY-MM-DD
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
var TMO = 3000;
// Admin passcode. Set ADMIN_PASSCODE in Netlify env to override; falls back to the shipped default.
function adminPass() {
  try { if (typeof Netlify !== "undefined" && Netlify.env) { const v = Netlify.env.get("ADMIN_PASSCODE"); if (v) return v; } } catch (e) {}
  try { if (typeof process !== "undefined" && process.env && process.env.ADMIN_PASSCODE) return process.env.ADMIN_PASSCODE; } catch (e) {}
  return "market26";
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function authed(req) {
  const want = adminPass();
  let got = req.headers.get("x-passcode") || "";
  if (!got) { try { got = new URL(req.url).searchParams.get("pass") || ""; } catch (e) {} }
  return got === want;
}
function today() { return new Date().toISOString().slice(0, 10); }
function withTimeout(p, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + "-timeout")), TMO))]);
}
async function getBlobsStore(useToken) {
  let getStore;
  try { ({ getStore } = await import("@netlify/blobs")); }
  catch (e) { throw new Error("module-load: " + String(e && e.message || e)); }
  const opts = { name: STORE_NAME, consistency: "strong" };
  if (useToken) {
    let t = null;
    try { t = (typeof Netlify !== "undefined" && Netlify.env) ? Netlify.env.get("NETLIFY_BLOBS_TOKEN") : null; } catch (e) {}
    if (!t) throw new Error("no-token-env");
    opts.token = t; opts.siteID = SITE_ID;
  }
  return getStore(opts);
}
var data_default = async (req) => {
  if (!authed(req)) return json({ ok: false, error: "auth" }, 401);
  const url = new URL(req.url);

  if (req.method === "GET") {
    // Backup retrieval: ?backups lists snapshot dates; ?backup=bk_YYYY-MM-DD returns one snapshot.
    const wantList = url.searchParams.has("backups");
    const wantOne = url.searchParams.get("backup") || "";
    if (wantList || wantOne) {
      let errs = [];
      for (const useToken of [false, true]) {
        try {
          const store = await getBlobsStore(useToken);
          if (wantOne) {
            const key = wantOne.startsWith(BK_PREFIX) ? wantOne : BK_PREFIX + wantOne;
            const snap = await withTimeout(store.get(key, { type: "json" }), "get-backup");
            return json({ ok: true, key, snapshot: snap ?? null });
          }
          const listed = await withTimeout(store.list({ prefix: BK_PREFIX }), "list-backups");
          const keys = ((listed && listed.blobs) || []).map((b) => b.key).sort().reverse();
          return json({ ok: true, backups: keys });
        } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
      }
      return json({ ok: false, error: "backup-read", detail: errs.join(" | ") }, 500);
    }
    // Normal live read.
    let ok = false, state = null, inbox = [], errs = [];
    for (const useToken of [false, true]) {
      try {
        const store = await getBlobsStore(useToken);
        state = await withTimeout(store.get(STATE_KEY, { type: "json" }), "get-state");
        const ib = await withTimeout(store.get(INBOX_KEY, { type: "json" }), "get-inbox");
        inbox = Array.isArray(ib) ? ib : [];
        ok = true; break;
      } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
    }
    if (!ok) return json({ ok: false, error: "read", detail: errs.join(" | ") }, 500);
    return json({ ok: true, state: state ?? null, inbox });
  }

  if (req.method === "POST") {
    let body = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
    let ok = false, via = "", errs = [];
    for (const useToken of [false, true]) {
      try {
        const store = await getBlobsStore(useToken);
        const hasState = body && typeof body.state === "object" && body.state !== null;
        const hasInbox = body && Array.isArray(body.inbox);
        if (hasState) await withTimeout(store.setJSON(STATE_KEY, body.state), "set-state");
        if (hasInbox) await withTimeout(store.setJSON(INBOX_KEY, body.inbox), "set-inbox");
        // Automatic daily backup snapshot (one per day, overwritten as the day goes on).
        // Best-effort: a snapshot failure must never fail the live save.
        try {
          const snap = {
            savedAt: new Date().toISOString(),
            state: hasState ? body.state : null,
            inbox: hasInbox ? body.inbox : []
          };
          await withTimeout(store.setJSON(BK_PREFIX + today(), snap), "set-backup");
        } catch (e) {}
        ok = true; via = useToken ? "token" : "auto"; break;
      } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
    }
    if (!ok) return json({ ok: false, error: "write", detail: errs.join(" | ") }, 500);
    return json({ ok: true, via });
  }

  return json({ ok: false, error: "method" }, 405);
};
var config = { path: "/api/data" };
export { config, data_default as default };
