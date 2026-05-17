import { gql, logUserErrors, type UserError } from "./client.ts";
import {
  TESTIMONIALS,
  FAQ_ITEMS,
  COMPARISON_POINTS,
  FEATURES,
  type TestimonialContent,
} from "./content-data.ts";

const PRODUCT_BY_HANDLE = `
query ProductByHandle($handle: String!) {
  productByHandle(handle: $handle) { id }
}`;

const METAOBJECT_BY_HANDLE = `
query MetaobjectByHandle($handle: MetaobjectHandleInput!) {
  metaobjectByHandle(handle: $handle) { id handle }
}`;

const METAOBJECT_CREATE = `
mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
  metaobjectCreate(metaobject: $metaobject) {
    metaobject { id handle type }
    userErrors { field message code }
  }
}`;

type FieldInput = { key: string; value: string };

async function exists(type: string, handle: string): Promise<boolean> {
  const res = await gql<{ metaobjectByHandle: { id: string } | null }>(
    METAOBJECT_BY_HANDLE,
    { handle: { type, handle } },
  );
  return res.metaobjectByHandle !== null;
}

async function createEntry(
  type: string,
  handle: string,
  fields: FieldInput[],
  label: string,
): Promise<void> {
  if (await exists(type, handle)) {
    console.log(`  ↳ ${label} already exists, skipping`);
    return;
  }
  const res = await gql<{
    metaobjectCreate: {
      metaobject: { id: string; handle: string } | null;
      userErrors: UserError[];
    };
  }>(METAOBJECT_CREATE, {
    metaobject: {
      type,
      handle,
      fields,
      capabilities: { publishable: { status: "ACTIVE" } },
    },
  });
  if (res.metaobjectCreate.metaobject) {
    console.log(`  ✓ ${label}`);
  } else {
    logUserErrors(label, res.metaobjectCreate.userErrors);
  }
}

async function resolveProductGid(handle: string): Promise<string | null> {
  const res = await gql<{ productByHandle: { id: string } | null }>(
    PRODUCT_BY_HANDLE,
    { handle },
  );
  return res.productByHandle?.id ?? null;
}

async function seedTestimonials() {
  console.log("→ Seeding testimonials");
  const productCache = new Map<string, string>();
  for (const t of TESTIMONIALS as TestimonialContent[]) {
    let productGid = productCache.get(t.productHandle);
    if (!productGid) {
      const gid = await resolveProductGid(t.productHandle);
      if (!gid) {
        console.log(`  ✗ ${t.handle}: product ${t.productHandle} not found, skipping`);
        continue;
      }
      productGid = gid;
      productCache.set(t.productHandle, gid);
    }
    await createEntry(
      "testimonial",
      t.handle,
      [
        { key: "name", value: t.name },
        { key: "quote", value: t.quote },
        { key: "rating", value: String(t.rating) },
        { key: "product", value: productGid },
        { key: "category", value: t.category },
      ],
      `${t.name} (${t.category}, ${t.productHandle})`,
    );
  }
}

async function seedFaqItems() {
  console.log("→ Seeding FAQ items");
  for (const f of FAQ_ITEMS) {
    await createEntry(
      "faq_item",
      f.handle,
      [
        { key: "question", value: f.question },
        { key: "answer", value: f.answer },
        { key: "category", value: f.category },
      ],
      `${f.category}: ${f.question}`,
    );
  }
}

async function seedComparisonPoints() {
  console.log("→ Seeding comparison points");
  for (const c of COMPARISON_POINTS) {
    await createEntry(
      "comparison_point",
      c.handle,
      [
        { key: "claim", value: c.claim },
        { key: "our_value", value: c.ourValue },
        { key: "competitor_value", value: c.competitorValue },
        { key: "category", value: c.category },
      ],
      c.claim,
    );
  }
}

async function seedFeatures() {
  console.log("→ Seeding features");
  for (const f of FEATURES) {
    await createEntry(
      "feature",
      f.handle,
      [
        { key: "title", value: f.title },
        { key: "description", value: f.description },
      ],
      f.title,
    );
  }
}

export async function seedContent() {
  await seedTestimonials();
  await seedFaqItems();
  await seedComparisonPoints();
  await seedFeatures();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedContent();
}
