import { gql, logUserErrors, type UserError } from "./client.ts";

type FieldDef = {
  key: string;
  name: string;
  type: string;
  required?: boolean;
  validations?: { name: string; value: string }[];
};

type MetaobjectDef = {
  type: string;
  name: string;
  description: string;
  fieldDefinitions: FieldDef[];
};

const DEFINITIONS: MetaobjectDef[] = [
  {
    type: "testimonial",
    name: "Testimonial",
    description: "Customer testimonial — used in testimonial-grid and PDP sections.",
    fieldDefinitions: [
      { key: "name", name: "Name", type: "single_line_text_field", required: true },
      { key: "quote", name: "Quote", type: "multi_line_text_field", required: true },
      { key: "rating", name: "Rating", type: "number_integer" },
      { key: "product", name: "Product", type: "product_reference" },
      { key: "photo", name: "Photo", type: "file_reference" },
    ],
  },
  {
    type: "comparison_point",
    name: "Comparison point",
    description: "One row in an 'us vs them' comparison table.",
    fieldDefinitions: [
      { key: "claim", name: "Claim", type: "single_line_text_field", required: true },
      { key: "our_value", name: "Our value", type: "single_line_text_field", required: true },
      { key: "competitor_value", name: "Competitor value", type: "single_line_text_field" },
      { key: "category", name: "Category", type: "single_line_text_field" },
    ],
  },
  {
    type: "faq_item",
    name: "FAQ item",
    description: "One Q&A pair, used in faq-accordion sections.",
    fieldDefinitions: [
      { key: "question", name: "Question", type: "single_line_text_field", required: true },
      { key: "answer", name: "Answer", type: "multi_line_text_field", required: true },
      { key: "category", name: "Category", type: "single_line_text_field" },
    ],
  },
  {
    type: "feature",
    name: "Feature",
    description: "A product/brand feature — used in feature grids on LPs.",
    fieldDefinitions: [
      { key: "title", name: "Title", type: "single_line_text_field", required: true },
      { key: "description", name: "Description", type: "multi_line_text_field" },
      { key: "icon", name: "Icon", type: "file_reference" },
    ],
  },
];

const CREATE = `
mutation CreateMetaobjectDef($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) {
    metaobjectDefinition { id type name }
    userErrors { field message code }
  }
}`;

export async function seedMetaobjectDefinitions() {
  console.log("→ Creating metaobject definitions");
  for (const def of DEFINITIONS) {
    const input = {
      type: def.type,
      name: def.name,
      description: def.description,
      access: { storefront: "PUBLIC_READ" },
      capabilities: { publishable: { enabled: true } },
      fieldDefinitions: def.fieldDefinitions.map((f) => ({
        key: f.key,
        name: f.name,
        type: f.type,
        required: f.required ?? false,
        validations: f.validations,
      })),
    };

    const res = await gql<{
      metaobjectDefinitionCreate: {
        metaobjectDefinition: { id: string; type: string; name: string } | null;
        userErrors: UserError[];
      };
    }>(CREATE, { definition: input });

    const { metaobjectDefinition, userErrors } = res.metaobjectDefinitionCreate;
    if (metaobjectDefinition) {
      console.log(`  ✓ ${def.type} (${metaobjectDefinition.id})`);
    } else {
      logUserErrors(def.type, userErrors);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedMetaobjectDefinitions();
}
