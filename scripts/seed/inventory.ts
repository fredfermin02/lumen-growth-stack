import { gql, logUserErrors, type UserError } from "./client.ts";

const LOCATION_QUERY = `
query Locations {
  locations(first: 5) { nodes { id name isActive } }
}`;

const PRODUCTS_INVENTORY = `
query ProductsInventory {
  products(first: 20, query: "vendor:Lumen") {
    nodes {
      title
      variants(first: 5) {
        nodes { sku displayName inventoryItem { id } }
      }
    }
  }
}`;

const SET_QUANTITIES = `
mutation SetQuantities($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup { id }
    userErrors { field message code }
  }
}`;

export async function seedInventory(target: number = 1000) {
  console.log(`→ Setting inventory to ${target} for all Lumen variants`);

  const locResp = await gql<{
    locations: { nodes: Array<{ id: string; name: string; isActive: boolean }> };
  }>(LOCATION_QUERY);
  const location = locResp.locations.nodes.find((l) => l.isActive);
  if (!location) throw new Error("No active location found");
  console.log(`  location: ${location.name} (${location.id})`);

  const productsResp = await gql<{
    products: {
      nodes: Array<{
        title: string;
        variants: {
          nodes: Array<{ sku: string; displayName: string; inventoryItem: { id: string } }>;
        };
      }>;
    };
  }>(PRODUCTS_INVENTORY);

  const quantities = productsResp.products.nodes.flatMap((p) =>
    p.variants.nodes.map((v) => ({
      inventoryItemId: v.inventoryItem.id,
      locationId: location.id,
      quantity: target,
    })),
  );

  console.log(`  variants to update: ${quantities.length}`);

  const res = await gql<{
    inventorySetQuantities: {
      inventoryAdjustmentGroup: { id: string } | null;
      userErrors: UserError[];
    };
  }>(SET_QUANTITIES, {
    input: {
      name: "available",
      reason: "correction",
      quantities,
      ignoreCompareQuantity: true,
    },
  });

  const { inventoryAdjustmentGroup, userErrors } = res.inventorySetQuantities;
  if (inventoryAdjustmentGroup) {
    console.log(`  ✓ Adjustment group ${inventoryAdjustmentGroup.id}`);
  } else {
    logUserErrors("inventorySetQuantities", userErrors);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedInventory(1000);
}
