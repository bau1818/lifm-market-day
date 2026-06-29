// netlify/functions/data.js — open data store (gate is client-side in the app)
import { getStore } from "@netlify/blobs";
var STORE_NAME = "marketday";
var STATE_KEY = "state";
var INBOX_KEY = "inbox";
var SITE_ID = "02c25e1d-7279-447c-ac91-9a666f0225c7";
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
// Explicit connection works on drag-drop deploys AND builds.
// Falls back to automatic config when no token is set (e.g. git builds).
function blobStore() {
  const opts = { name: STORE_NAME, consistency: "strong" };
  try {
    const t = (typeof Netlify !== "undefined" && Netlify.env) ? Netlify.env.get("NETLIFY_BLOBS_TOKEN") : null;
    if (t) { opts.token = t; opts.siteID = SITE_ID; }
  } catch (e) {}
  return getStore(opts);
}
var data_default = async (req) => {
  let store;
  try { store = blobStore(); } catch (e) { return json({ ok: false, error: "store-init", detail: String(e && e.message || e) }, 500); }
  if (req.method === "GET") {
    try {
      const state = await store.get(STATE_KEY, { type: "json" });
      const inbox = await store.get(INBOX_KEY, { type: "json" });
      return json({ ok: true, state: state ?? null, inbox: Array.isArray(inbox) ? inbox : [] });
    } catch (e) { return json({ ok: false, error: "read", detail: String(e && e.message || e) }, 500); }
  }
  if (req.method === "POST") {
    let body = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
    try {
      if (body && typeof body.state === "object" && body.state !== null) await store.setJSON(STATE_KEY, body.state);
      if (body && Array.isArray(body.inbox)) await store.setJSON(INBOX_KEY, body.inbox);
      return json({ ok: true });
    } catch (e) { return json({ ok: false, error: "write", detail: String(e && e.message || e) }, 500); }
  }
  return json({ ok: false, error: "method" }, 405);
};
var config = { path: "/api/data" };
export { config, data_default as default };
