import { gql } from "./client.ts";

const Q = `
query Health {
  shop {
    name
    myshopifyDomain
    primaryDomain { url }
    currencyCode
    shipsToCountries
  }
  products(first: 10, query: "vendor:Lumen") {
    nodes {
      title
      handle
      status
      onlineStorePreviewUrl
      variants(first: 5) { nodes { sku price displayName inventoryQuantity } }
      metafields(first: 10) { nodes { namespace key value } }
    }
  }
}`;

const data = await gql<{
  shop: {
    name: string;
    myshopifyDomain: string;
    primaryDomain: { url: string };
    currencyCode: string;
    shipsToCountries: string[];
  };
  products: {
    nodes: Array<{
      title: string;
      handle: string;
      status: string;
      onlineStorePreviewUrl: string;
      variants: { nodes: Array<{ sku: string; price: string; displayName: string; inventoryQuantity: number }> };
      metafields: { nodes: Array<{ namespace: string; key: string; value: string }> };
    }>;
  };
}>(Q);

console.log(`Shop: ${data.shop.name} (${data.shop.myshopifyDomain})`);
console.log(`Primary URL: ${data.shop.primaryDomain.url}`);
console.log(`Currency: ${data.shop.currencyCode}`);
console.log(`Ships to: ${data.shop.shipsToCountries.join(", ")}\n`);

console.log("Products:");
for (const p of data.products.nodes) {
  console.log(`  ${p.status === "ACTIVE" ? "✓" : "✗"} ${p.title} (${p.handle}) — ${p.status}`);
  console.log(`      preview: ${p.onlineStorePreviewUrl}`);
  for (const v of p.variants.nodes) {
    console.log(`      • ${v.displayName} — $${v.price} — SKU ${v.sku} — inv ${v.inventoryQuantity}`);
  }
  const fn = p.metafields.nodes.find((m) => m.key === "function");
  const aud = p.metafields.nodes.find((m) => m.key === "audience");
  console.log(`      function=${fn?.value} audience=${aud?.value}`);
}
