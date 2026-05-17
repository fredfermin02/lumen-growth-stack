import { gql, logUserErrors, type UserError } from "./client.ts";
import { FLAVORS, VARIANTS, type Flavor } from "./data.ts";

const LOCATION_QUERY = `
query Locations {
  locations(first: 5) { nodes { id name isActive } }
}`;

const PRODUCT_BY_HANDLE = `
query ProductByHandle($handle: String!) {
  productByHandle(handle: $handle) { id title handle }
}`;

const PRODUCT_SET = `
mutation ProductSet($input: ProductSetInput!) {
  productSet(synchronous: true, input: $input) {
    product { id handle title variants(first: 5) { nodes { id sku inventoryItem { id } } } }
    userErrors { field message code }
  }
}`;

const INVENTORY_ACTIVATE = `
mutation InventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int!) {
  inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
    inventoryLevel { id quantities(names: ["available"]) { name quantity } }
    userErrors { field message }
  }
}`;

function buildProductInput(flavor: Flavor) {
  return {
    handle: flavor.handle,
    title: flavor.title,
    vendor: flavor.vendor,
    productType: flavor.productType,
    descriptionHtml: `<p>${flavor.description}</p>`,
    status: "ACTIVE",
    tags: flavor.tags,
    productOptions: [
      {
        name: "Pack Size",
        values: VARIANTS.map((v) => ({ name: v.name })),
      },
    ],
    variants: VARIANTS.map((v) => ({
      optionValues: [{ optionName: "Pack Size", name: v.name }],
      price: v.priceUsd,
      sku: `LUM-${flavor.shortCode}-${v.suffix}`,
      inventoryItem: { tracked: true },
      inventoryPolicy: "DENY",
    })),
    metafields: [
      {
        namespace: "custom",
        key: "function",
        type: "single_line_text_field",
        value: flavor.function,
      },
      {
        namespace: "custom",
        key: "audience",
        type: "list.single_line_text_field",
        value: JSON.stringify(flavor.audience),
      },
      {
        namespace: "custom",
        key: "caffeine_mg",
        type: "number_integer",
        value: String(flavor.caffeineMg),
      },
      {
        namespace: "custom",
        key: "hero_ingredient",
        type: "single_line_text_field",
        value: flavor.heroIngredient,
      },
      {
        namespace: "custom",
        key: "flavor_notes",
        type: "single_line_text_field",
        value: flavor.flavorNotes,
      },
    ],
  };
}

export async function seedProducts() {
  console.log("→ Resolving primary location");
  const locResp = await gql<{
    locations: { nodes: Array<{ id: string; name: string; isActive: boolean }> };
  }>(LOCATION_QUERY);
  const location = locResp.locations.nodes.find((l) => l.isActive);
  if (!location) throw new Error("No active location found");
  console.log(`  ✓ ${location.name} (${location.id})`);

  console.log("→ Creating products");
  for (const flavor of FLAVORS) {
    const existing = await gql<{ productByHandle: { id: string; title: string } | null }>(
      PRODUCT_BY_HANDLE,
      { handle: flavor.handle },
    );
    if (existing.productByHandle) {
      console.log(`  ↳ ${flavor.title} already exists, skipping`);
      continue;
    }

    const res = await gql<{
      productSet: {
        product: {
          id: string;
          handle: string;
          title: string;
          variants: {
            nodes: Array<{ id: string; sku: string; inventoryItem: { id: string } }>;
          };
        } | null;
        userErrors: UserError[];
      };
    }>(PRODUCT_SET, { input: buildProductInput(flavor) });

    const { product, userErrors } = res.productSet;
    if (!product) {
      logUserErrors(flavor.title, userErrors);
      continue;
    }
    console.log(`  ✓ ${product.title} (${product.handle})`);

    for (const variant of product.variants.nodes) {
      const inv = await gql<{
        inventoryActivate: {
          inventoryLevel: { id: string } | null;
          userErrors: UserError[];
        };
      }>(INVENTORY_ACTIVATE, {
        inventoryItemId: variant.inventoryItem.id,
        locationId: location.id,
        available: 1000,
      });
      if (inv.inventoryActivate.inventoryLevel) {
        console.log(`      • ${variant.sku} stocked @ 1000`);
      } else {
        logUserErrors(`${variant.sku} inventory`, inv.inventoryActivate.userErrors);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedProducts();
}
