// netlify/functions/apply.js — public vendor application intake
var STORE_NAME = "marketday";
var INBOX_KEY = "inbox";
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
var TMO = 3000;
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function clean(s, max) { if (s == null) return ""; return String(s).slice(0, max || 500); }
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
var apply_default = async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
  const a = (body && body.application) || {};
  if (!a.name || !String(a.name).trim()) return json({ ok: false, error: "name-required" }, 400);
  const entry = {
    id: "app" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    submittedAt: new Date().toISOString(), status: "new",
    name: clean(a.name, 120), contact: clean(a.contact, 120), email: clean(a.email, 160),
    phone: clean(a.phone, 60), website: clean(a.website, 200), category: clean(a.category, 40),
    products: clean(a.products, 600), frequency: clean(a.frequency, 80), markets: clean(a.markets, 120),
    address: clean(a.address, 200), insuranceLink: clean(a.insuranceLink, 400),
    docLinks: Array.isArray(a.docLinks) ? a.docLinks.slice(0, 6).map((d) => clean(d, 400)) : [],
    message: clean(a.message, 1000)
  };
  let ok = false, via = "", errs = [];
  for (const useToken of [false, true]) {
    try {
      const store = await getBlobsStore(useToken);
      let inbox = await withTimeout(store.get(INBOX_KEY, { type: "json" }), "get");
      if (!Array.isArray(inbox)) inbox = [];
      inbox.push(entry);
      await withTimeout(store.setJSON(INBOX_KEY, inbox), "set");
      ok = true; via = useToken ? "token" : "auto"; break;
    } catch (e) { errs.push((useToken ? "token: " : "auto: ") + String(e && e.message || e)); }
  }
  if (!ok) return json({ ok: false, error: "store", detail: errs.join(" | ") }, 500);
  return json({ ok: true, via });
};
var config = { path: "/api/apply" };
export { config, apply_default as default };
