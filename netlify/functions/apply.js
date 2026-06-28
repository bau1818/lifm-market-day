// netlify/functions/apply.mts  (public vendor application intake)
import { getStore } from "@netlify/blobs";
var STORE_NAME = "marketday";
var INBOX_KEY = "inbox";
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
function clean(s, max) {
  if (s == null) return "";
  return String(s).slice(0, max || 500);
}
var apply_default = async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad-body" }, 400); }
  const a = (body && body.application) || {};
  if (!a.name || !String(a.name).trim()) return json({ ok: false, error: "name-required" }, 400);

  const entry = {
    id: "app" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    submittedAt: new Date().toISOString(),
    status: "new",
    name: clean(a.name, 120),
    contact: clean(a.contact, 120),
    email: clean(a.email, 160),
    phone: clean(a.phone, 60),
    website: clean(a.website, 200),
    category: clean(a.category, 40),
    products: clean(a.products, 600),
    frequency: clean(a.frequency, 80),
    markets: clean(a.markets, 120),
    address: clean(a.address, 200),
    insuranceLink: clean(a.insuranceLink, 400),
    docLinks: Array.isArray(a.docLinks) ? a.docLinks.slice(0, 6).map((d) => clean(d, 400)) : [],
    message: clean(a.message, 1000)
  };

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const inbox = (await store.get(INBOX_KEY, { type: "json" })) || [];
  inbox.push(entry);
  await store.setJSON(INBOX_KEY, inbox);

  // Optional email notification — only fires if you set RESEND_API_KEY + NOTIFY_EMAIL in Netlify.
  try {
    const key = Netlify.env.get("RESEND_API_KEY");
    const to = Netlify.env.get("NOTIFY_EMAIL");
    if (key && to) {
      const lines = [
        `New vendor application for Long Island Farmers Markets`,
        ``,
        `Business: ${entry.name}`,
        `Contact: ${entry.contact}`,
        `Email: ${entry.email}`,
        `Phone: ${entry.phone}`,
        `Category: ${entry.category}`,
        `Markets: ${entry.markets}`,
        `Frequency: ${entry.frequency}`,
        `Products: ${entry.products}`,
        `Website: ${entry.website}`,
        `Insurance: ${entry.insuranceLink}`,
        `Message: ${entry.message}`,
        ``,
        `Open Market Day to review and import this vendor.`
      ].join("\n");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "authorization": `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: "Market Day <onboarding@resend.dev>",
          to: [to],
          subject: `New vendor application: ${entry.name}`,
          text: lines
        })
      });
    }
  } catch (e) { /* never block a submission on email */ }

  return json({ ok: true });
};
var config = { path: "/api/apply" };
export {
  config,
  apply_default as default
};
