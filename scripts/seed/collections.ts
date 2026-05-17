import { gql, logUserErrors, type UserError } from "./client.ts";
import { COLLECTIONS } from "./data.ts";

const COLLECTION_BY_HANDLE = `
query CollectionByHandle($handle: String!) {
  collectionByHandle(handle: $handle) { id title handle }
}`;

const COLLECTION_CREATE = `
mutation CollectionCreate($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle title }
    userErrors { field message }
  }
}`;

const METAFIELD_DEF_LOOKUP = `
query LookupDef($namespace: String!, $key: String!) {
  metafieldDefinitions(first: 1, ownerType: PRODUCT, namespace: $namespace, key: $key) {
    nodes { id namespace key }
  }
}`;

async function getFunctionDefinitionId(): Promise<string> {
  const res = await gql<{
    metafieldDefinitions: { nodes: Array<{ id: string }> };
  }>(METAFIELD_DEF_LOOKUP, { namespace: "custom", key: "function" });
  const node = res.metafieldDefinitions.nodes[0];
  if (!node) {
    throw new Error("custom.function metafield definition not found — run metafields seed first");
  }
  return node.id;
}

export async function seedCollections() {
  console.log("→ Resolving custom.function metafield definition");
  const functionDefId = await getFunctionDefinitionId();
  console.log(`  ✓ ${functionDefId}`);

  console.log("→ Creating collections");
  for (const col of COLLECTIONS) {
    const existing = await gql<{ collectionByHandle: { id: string } | null }>(
      COLLECTION_BY_HANDLE,
      { handle: col.handle },
    );
    if (existing.collectionByHandle) {
      console.log(`  ↳ ${col.title} already exists, skipping`);
      continue;
    }

    const input: Record<string, unknown> = {
      handle: col.handle,
      title: col.title,
      descriptionHtml: col.descriptionHtml,
    };

    if ("metafieldFunctionValues" in col) {
      input.ruleSet = {
        appliedDisjunctively: true,
        rules: col.metafieldFunctionValues.map((v) => ({
          column: "PRODUCT_METAFIELD_DEFINITION",
          relation: "EQUALS",
          condition: v,
          conditionObjectId: functionDefId,
        })),
      };
    } else if (col.handle === "shop-all") {
      input.ruleSet = {
        appliedDisjunctively: false,
        rules: [{ column: "VENDOR", relation: "EQUALS", condition: "Lumen" }],
      };
    }

    const res = await gql<{
      collectionCreate: {
        collection: { id: string; handle: string; title: string } | null;
        userErrors: UserError[];
      };
    }>(COLLECTION_CREATE, { input });

    const { collection, userErrors } = res.collectionCreate;
    if (collection) {
      console.log(`  ✓ ${collection.title} (${collection.handle})`);
    } else {
      logUserErrors(col.title, userErrors);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedCollections();
}
