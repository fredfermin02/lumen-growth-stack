import { seedMetafieldDefinitions } from "./metafields.ts";
import { seedMetaobjectDefinitions } from "./metaobjects.ts";
import { seedProducts } from "./products.ts";
import { seedInventory } from "./inventory.ts";
import { seedCollections } from "./collections.ts";
import { publishToOnlineStore } from "./publish.ts";

async function main() {
  console.log("=== Lumen seed ===\n");
  await seedMetafieldDefinitions();
  console.log();
  await seedMetaobjectDefinitions();
  console.log();
  await seedProducts();
  console.log();
  await seedInventory();
  console.log();
  await seedCollections();
  console.log();
  await publishToOnlineStore();
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
