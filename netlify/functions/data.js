// netlify/functions/data.mts
import { getStore } from "@netlify/blobs";
var STORE_NAME = "marketday";
var KEY = "state";
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
var data_default = async (req, _context) => {
  const expected = Netlify.env.get("APP_PASSCODE") || "";
  const given = req.headers.get("x-passcode") || "";
  if (!expected || given !== expected) {
    return json({ ok: false, auth: false }, 401);
  }
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  if (req.method === "GET") {
    const state = await store.get(KEY, { type: "json" });
    return json({ ok: true, state: state ?? null });
  }
  if (req.method === "POST") {
    let body = null;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "bad-body" }, 400);
    }
    if (!body || typeof body.state !== "object") {
      return json({ ok: false, error: "bad-state" }, 400);
    }
    await store.setJSON(KEY, body.state);
    return json({ ok: true });
  }
  return json({ ok: false, error: "method" }, 405);
};
var config = {
  path: "/api/data"
};
export {
  config,
  data_default as default
};
