// Lumen Custom Pixel
// =============================================================================
// Source of truth lives in this repo. Paste the contents of this file into:
//   Shopify admin → Settings → Customer events → Add custom pixel → Code tab
//
// Pixel permissions: leave at default ("Customer privacy"). Shopify blocks
// events for visitors who haven't granted analytics consent automatically.
//
// Architecture: pixel sends plain JSON over the Customer Events API to Stape's
// server-side container. Stape signs the request with HMAC and forwards it to
// our Lambda Function URL (`infra/template.yaml` → EventsWebhookFunction).
// We do NOT compute HMAC in the browser — the secret would be exposed.
// =============================================================================

// Stape server-side container endpoint. The path `/lumen` must match the
// Request Path configured on the Stape Data Client (sGTM) that receives this.
const STAPE_ENDPOINT = "https://pvpskmis.usu.stape.io/lumen";

const SHOP = init.data.shop.myshopifyDomain;

// Stable per-browser ID, used as `user_pseudo_id` for cross-event stitching.
// Mirrors GA4's client_id pattern. Stored in the pixel sandbox's localStorage.
async function getUserPseudoId() {
  let id = await browser.localStorage.getItem("lumen_upid");
  if (!id) {
    id = uuid();
    await browser.localStorage.setItem("lumen_upid", id);
  }
  return id;
}

// Lightweight UUIDv4 — crypto.randomUUID is not guaranteed in the pixel sandbox.
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Meta CAPI matching parameters (read from cookies set by any browser pixel,
// or absent if we're purely server-side — Stape backfills _fbp if missing).
async function metaIds() {
  const [fbp, fbc] = await Promise.all([
    browser.cookie.get("_fbp"),
    browser.cookie.get("_fbc"),
  ]);
  return { fbp: fbp || undefined, fbc: fbc || undefined };
}

// Single send path. Uses sendBeacon so events fire reliably on page-unload
// (notably checkout_completed, which navigates away immediately).
async function send(eventName, data, value, currency) {
  const { fbp, fbc } = await metaIds();
  const payload = {
    // event_id is the dedup key shared across destinations: Meta CAPI
    // dedupes against the browser pixel event_id, GA4 stores it as a
    // custom dimension, the Lambda partitions on it.
    event_id: uuid(),
    event_name: eventName,
    occurred_at: new Date().toISOString(),
    shop: SHOP,
    user_pseudo_id: await getUserPseudoId(),
    value,
    currency,
    client_user_agent: navigator.userAgent,
    fbp,
    fbc,
    data,
  };

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: "application/json" });

  if (typeof navigator.sendBeacon === "function") {
    const ok = navigator.sendBeacon(STAPE_ENDPOINT, blob);
    if (ok) return;
  }
  // Fallback: keepalive fetch survives unload on modern browsers
  fetch(STAPE_ENDPOINT, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
    mode: "no-cors",
  });
}

// ---------------------------------------------------------------------------
// Event subscriptions
// Reference: https://shopify.dev/docs/api/web-pixels-api/standard-events
// ---------------------------------------------------------------------------

analytics.subscribe("product_viewed", (event) => {
  const v = event.data.productVariant;
  send(
    "product_viewed",
    {
      product_id: v.product.id,
      product_title: v.product.title,
      variant_id: v.id,
      variant_title: v.title,
      sku: v.sku,
    },
    Number(v.price.amount),
    v.price.currencyCode,
  );
});

analytics.subscribe("product_added_to_cart", (event) => {
  const line = event.data.cartLine;
  send(
    "product_added_to_cart",
    {
      product_id: line.merchandise.product.id,
      product_title: line.merchandise.product.title,
      variant_id: line.merchandise.id,
      variant_title: line.merchandise.title,
      sku: line.merchandise.sku,
      quantity: line.quantity,
    },
    Number(line.cost.totalAmount.amount),
    line.cost.totalAmount.currencyCode,
  );
});

analytics.subscribe("checkout_started", (event) => {
  const c = event.data.checkout;
  send(
    "checkout_started",
    {
      checkout_id: c.token,
      line_items: (c.lineItems || []).map((li) => ({
        variant_id: li.variant?.id,
        product_id: li.variant?.product?.id,
        title: li.title,
        quantity: li.quantity,
      })),
    },
    Number(c.totalPrice?.amount ?? 0),
    c.totalPrice?.currencyCode,
  );
});

analytics.subscribe("checkout_completed", (event) => {
  const c = event.data.checkout;
  send(
    "checkout_completed",
    {
      order_id: c.order?.id,
      checkout_id: c.token,
      line_items: (c.lineItems || []).map((li) => ({
        variant_id: li.variant?.id,
        product_id: li.variant?.product?.id,
        title: li.title,
        quantity: li.quantity,
      })),
    },
    Number(c.totalPrice?.amount ?? 0),
    c.totalPrice?.currencyCode,
  );
});
