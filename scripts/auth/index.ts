import "dotenv/config";
import { createServer } from "node:http";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STORE = process.env.SHOPIFY_STORE;
const CLIENT_ID = process.env.SHOPIFY_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_APP_CLIENT_SECRET;
const REDIRECT_PORT = 3000;
const REDIRECT_PATH = "/auth/callback";
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

const SCOPES = [
  "read_orders",
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_customers",
  "read_publications",
  "write_publications",
  "write_metaobject_definitions",
  "write_metaobjects",
  "read_locations",
  "read_price_rules",
  "read_discounts",
].join(",");

function exit(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

if (!STORE) exit("Missing SHOPIFY_STORE in scripts/.env");
if (!CLIENT_ID) exit("Missing SHOPIFY_APP_CLIENT_ID in scripts/.env");
if (!CLIENT_SECRET) exit("Missing SHOPIFY_APP_CLIENT_SECRET in scripts/.env");

const state = randomBytes(16).toString("hex");

const installUrl =
  `https://${STORE}.myshopify.com/admin/oauth/authorize?` +
  new URLSearchParams({
    client_id: CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  }).toString();

console.log("\n→ Open this URL in your browser, log in, and authorize:\n");
console.log(`  ${installUrl}\n`);
console.log(`→ Listening on ${REDIRECT_URI} for the callback ...\n`);

function verifyHmac(params: URLSearchParams): boolean {
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const message = [...params.entries()]
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const computed = createHmac("sha256", CLIENT_SECRET!).update(message).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

function upsertEnvLine(path: string, key: string, value: string) {
  let contents = "";
  try {
    contents = readFileSync(path, "utf8");
  } catch {}
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(contents)) {
    contents = contents.replace(re, line);
  } else {
    if (contents.length && !contents.endsWith("\n")) contents += "\n";
    contents += line + "\n";
  }
  writeFileSync(path, contents, "utf8");
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith(REDIRECT_PATH)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");

  if (!code) {
    res.statusCode = 400;
    res.end("Missing code");
    return;
  }
  if (returnedState !== state) {
    res.statusCode = 400;
    res.end("State mismatch — possible CSRF, aborting.");
    server.close();
    process.exit(1);
  }
  if (!verifyHmac(url.searchParams)) {
    res.statusCode = 400;
    res.end("HMAC verification failed");
    server.close();
    process.exit(1);
  }

  console.log("  ✓ State + HMAC verified");
  console.log(`  ✓ Shop: ${shop}`);
  console.log("→ Exchanging code for access token ...");

  const tokenRes = await fetch(`https://${STORE}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    res.statusCode = 500;
    res.end(`Token exchange failed: ${tokenRes.status}\n${body}`);
    console.error(`✗ Token exchange failed: HTTP ${tokenRes.status}\n${body}`);
    server.close();
    process.exit(1);
  }

  const { access_token, scope } = (await tokenRes.json()) as {
    access_token: string;
    scope: string;
  };

  const envPath = resolve(import.meta.dirname, "..", ".env");
  upsertEnvLine(envPath, "SHOPIFY_ADMIN_API_TOKEN", access_token);

  console.log(`  ✓ Token acquired (prefix: ${access_token.slice(0, 6)}, length: ${access_token.length})`);
  console.log(`  ✓ Scopes granted: ${scope}`);
  console.log(`  ✓ Written to ${envPath}`);

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<html><body style="font-family:system-ui;padding:40px;max-width:600px;margin:auto">
      <h1>✓ Token saved</h1>
      <p>The Admin API access token has been written to <code>scripts/.env</code>. You can close this tab and return to your terminal.</p>
    </body></html>`,
  );

  server.close();
  process.exit(0);
});

server.listen(REDIRECT_PORT);
