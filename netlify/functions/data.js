// netlify/functions/data.js — open data store; tries auto-config first, token fallback
import { getStore } from "@netlify/blobs";
var STORE_NAME = "marketday";
var STATE_KEY = "state";
var INBOX_KEY = "inbox";
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
var TMO = 3000;
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function withTimeout(p, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + "-timeout")), TMO))]);
}
function storeWith(useToken) {
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
  if (req.method === "GET") {
    let ok = false, state = null, inbox = [], errs = [];
    for (const useToken of [false, true]) {
      try {
        const store = storeWith(useToken);
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
        const store = storeWith(useToken);
        if (body && typeof body.state === "object" && body.state !== null) await withTimeout(store.setJSON(STATE_KEY, body.state), "set-state");
        if (body && Array.isArray(body.inbox)) await withTimeout(store.setJSON(INBOX_KEY, body.inbox), "set-inbox");
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
