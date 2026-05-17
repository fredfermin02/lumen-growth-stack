import "dotenv/config";

const API_VERSION = "2025-10";

const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_API_TOKEN;

if (!store || !token) {
  console.error("Missing SHOPIFY_STORE or SHOPIFY_ADMIN_API_TOKEN in .env");
  process.exit(1);
}

const endpoint = `https://${store}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

export type UserError = { field?: string[] | null; message: string; code?: string };

export async function gql<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token!,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  return json.data as T;
}

export function logUserErrors(label: string, errors: UserError[]): boolean {
  const blocking = errors.filter(
    (e) => e.code !== "TAKEN" && !e.message.toLowerCase().includes("already exists"),
  );
  if (blocking.length === 0) {
    if (errors.length > 0) console.log(`  ↳ ${label}: already exists, skipping`);
    return false;
  }
  console.error(`  ✗ ${label}:`);
  for (const e of blocking) {
    console.error(`     [${e.field?.join(".") ?? "?"}] ${e.message}`);
  }
  return true;
}
