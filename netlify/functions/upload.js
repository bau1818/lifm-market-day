// netlify/functions/upload.js — file upload to Blobs (JSON-wrapped base64)
var STORE_NAME = "marketdayfiles";
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
var TMO = 9000;
var MAX_B64 = 9400000; // ~7MB binary
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
var upload_default = async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
  if (!body || body.pass !== adminPass()) return json({ ok: false, error: "auth" }, 401);
  const dataB64 = body.dataB64;
  if (!dataB64 || typeof dataB64 !== "string") return json({ ok: false, error: "no-data" }, 400);
  if (dataB64.length > MAX_B64) return json({ ok: false, error: "too-big" }, 413);
  const key = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const rec = { name: String(body.name || "file"), type: String(body.type || "application/octet-stream"), dataB64 };
  let ok = false, errs = [];
  for (const useToken of [false, true]) {
    try {
      const store = await getBlobsStore(useToken);
      await withTimeout(store.setJSON(key, rec), "set");
      ok = true; break;
    } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
  }
  if (!ok) return json({ ok: false, error: "write", detail: errs.join(" | ") }, 500);
  return json({ ok: true, key, name: rec.name, type: rec.type });
};
var config = { path: "/api/upload" };
export { config, upload_default as default };
