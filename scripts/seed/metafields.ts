import { gql, logUserErrors, type UserError } from "./client.ts";

type DefInput = {
  namespace: string;
  key: string;
  name: string;
  type: string;
  ownerType: "PRODUCT";
  description: string;
  access: { storefront: "PUBLIC_READ" };
  validations?: { name: string; value: string }[];
};

const STOREFRONT_PUBLIC = { storefront: "PUBLIC_READ" as const };

const DEFINITIONS: DefInput[] = [
  {
    namespace: "custom",
    key: "function",
    name: "Function",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description: "Functional category: focus, calm, beauty, or energy. Drives auto-collections and LP segmentation.",
    access: STOREFRONT_PUBLIC,
    validations: [
      { name: "choices", value: JSON.stringify(["focus", "calm", "beauty", "energy"]) },
    ],
  },
  {
    namespace: "custom",
    key: "audience",
    name: "Audience",
    type: "list.single_line_text_field",
    ownerType: "PRODUCT",
    description: "Target audience segments for LP routing.",
    access: STOREFRONT_PUBLIC,
    validations: [
      { name: "choices", value: JSON.stringify(["athletes", "wellness", "festival"]) },
    ],
  },
  {
    namespace: "custom",
    key: "caffeine_mg",
    name: "Caffeine (mg)",
    type: "number_integer",
    ownerType: "PRODUCT",
    description: "Caffeine content in milligrams per 12oz serving.",
    access: STOREFRONT_PUBLIC,
  },
  {
    namespace: "custom",
    key: "hero_ingredient",
    name: "Hero ingredient",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description: "Headline functional ingredient(s) for PDP and cards.",
    access: STOREFRONT_PUBLIC,
  },
  {
    namespace: "custom",
    key: "flavor_notes",
    name: "Flavor notes",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description: "Tasting notes line for PDP.",
    access: STOREFRONT_PUBLIC,
  },
];

const CREATE = `
mutation CreateDef($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id name namespace key }
    userErrors { field message code }
  }
}`;

export async function seedMetafieldDefinitions() {
  console.log("→ Creating product metafield definitions");
  for (const def of DEFINITIONS) {
    const res = await gql<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string; name: string } | null;
        userErrors: UserError[];
      };
    }>(CREATE, { definition: def });

    const { createdDefinition, userErrors } = res.metafieldDefinitionCreate;
    if (createdDefinition) {
      console.log(`  ✓ ${def.namespace}.${def.key} (${createdDefinition.id})`);
    } else {
      logUserErrors(`${def.namespace}.${def.key}`, userErrors);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedMetafieldDefinitions();
}
