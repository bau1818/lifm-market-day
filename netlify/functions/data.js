// netlify/functions/data.mts  — open data store (gate is client-side in the app)
import { getStore } from "@netlify/blobs";
var STORE_NAME = "marketday";
var STATE_KEY = "state";
var INBOX_KEY = "inbox";
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
var data_default = async (req) => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  if (req.method === "GET") {
    const state = await store.get(STATE_KEY, { type: "json" });
    const inbox = await store.get(INBOX_KEY, { type: "json" });
    return json({ ok: true, state: state ?? null, inbox: inbox ?? [] });
  }
  if (req.method === "POST") {
    let body = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
    if (body && typeof body.state === "object" && body.state !== null) {
      await store.setJSON(STATE_KEY, body.state);
    }
    if (body && Array.isArray(body.inbox)) {
      await store.setJSON(INBOX_KEY, body.inbox);
    }
    return json({ ok: true });
  }
  return json({ ok: false, error: "method" }, 405);
};
var config = { path: "/api/data" };
export { config, data_default as default };
