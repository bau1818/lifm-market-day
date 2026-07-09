// netlify/functions/file.js — serve an uploaded file from Blobs
var STORE_NAME = "marketdayfiles";
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
var TMO = 9000;
// Admin passcode. Set ADMIN_PASSCODE in Netlify env to override; falls back to the shipped default.
function adminPass() {
  try { if (typeof Netlify !== "undefined" && Netlify.env) { const v = Netlify.env.get("ADMIN_PASSCODE"); if (v) return v; } } catch (e) {}
  try { if (typeof process !== "undefined" && process.env && process.env.ADMIN_PASSCODE) return process.env.ADMIN_PASSCODE; } catch (e) {}
  return "farm3r26!";
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
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
var file_default = async (req) => {
  if (req.method !== "GET") return json({ ok: false, error: "method" }, 405);
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  const pass = url.searchParams.get("pass") || "";
  if (pass !== adminPass()) return json({ ok: false, error: "auth" }, 401);
  if (!key) return json({ ok: false, error: "no-key" }, 400);
  let rec = null, errs = [];
  for (const useToken of [false, true]) {
    try {
      const store = await getBlobsStore(useToken);
      rec = await withTimeout(store.get(key, { type: "json" }), "get");
      break;
    } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
  }
  if (!rec || !rec.dataB64) return json({ ok: false, error: "not-found" }, 404);
  let bytes;
  try {
    const bin = atob(rec.dataB64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch (e) { return json({ ok: false, error: "decode" }, 500); }
  const safe = String(rec.name || "file").replace(/[^\w.\-]+/g, "_");
  return new Response(bytes, { status: 200, headers: {
    "content-type": rec.type || "application/octet-stream",
    "content-disposition": 'inline; filename="' + safe + '"',
    "cache-control": "private, max-age=60"
  }});
};
var config = { path: "/api/file" };
export { config, file_default as default };
