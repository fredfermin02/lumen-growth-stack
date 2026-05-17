import { seedMetafieldDefinitions } from "./metafields.ts";
import { seedMetaobjectDefinitions } from "./metaobjects.ts";
import { seedProducts } from "./products.ts";
import { seedCollections } from "./collections.ts";

async function main() {
  console.log("=== Lumen seed ===\n");
  await seedMetafieldDefinitions();
  console.log();
  await seedMetaobjectDefinitions();
  console.log();
  await seedProducts();
  console.log();
  await seedCollections();
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
