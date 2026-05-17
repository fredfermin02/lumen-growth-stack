import { gql, logUserErrors, type UserError } from "./client.ts";

const PUBLICATIONS = `
query Publications {
  publications(first: 10) { nodes { id name } }
}`;

const RESOURCES_TO_PUBLISH = `
query Resources {
  products(first: 20, query: "vendor:Lumen") {
    nodes { id title resourcePublications(first: 5) { nodes { publication { id name } } } }
  }
  collections(first: 10) {
    nodes { id title resourcePublications(first: 5) { nodes { publication { id name } } } }
  }
}`;

const PUBLISH = `
mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable { availablePublicationsCount { count } }
    userErrors { field message }
  }
}`;

export async function publishToOnlineStore() {
  console.log("→ Finding Online Store publication");
  const pubsResp = await gql<{
    publications: { nodes: Array<{ id: string; name: string }> };
  }>(PUBLICATIONS);

  const onlineStore = pubsResp.publications.nodes.find((p) => p.name === "Online Store");
  if (!onlineStore) {
    console.error("  ✗ Online Store publication not found. Available:", pubsResp.publications.nodes.map((p) => p.name).join(", "));
    return;
  }
  console.log(`  ✓ ${onlineStore.name} (${onlineStore.id})`);

  const resResp = await gql<{
    products: { nodes: Array<{ id: string; title: string; resourcePublications: { nodes: Array<{ publication: { id: string; name: string } }> } }> };
    collections: { nodes: Array<{ id: string; title: string; resourcePublications: { nodes: Array<{ publication: { id: string; name: string } }> } }> };
  }>(RESOURCES_TO_PUBLISH);

  const all = [
    ...resResp.products.nodes.map((p) => ({ kind: "product", ...p })),
    ...resResp.collections.nodes.map((c) => ({ kind: "collection", ...c })),
  ];

  console.log(`→ Publishing ${all.length} resources to Online Store`);
  for (const r of all) {
    const already = r.resourcePublications.nodes.some((rp) => rp.publication.id === onlineStore.id);
    if (already) {
      console.log(`  ↳ ${r.kind} "${r.title}" already published`);
      continue;
    }
    const res = await gql<{
      publishablePublish: {
        publishable: { availablePublicationsCount: { count: number } } | null;
        userErrors: UserError[];
      };
    }>(PUBLISH, { id: r.id, input: [{ publicationId: onlineStore.id }] });

    if (res.publishablePublish.publishable) {
      console.log(`  ✓ ${r.kind} "${r.title}"`);
    } else {
      logUserErrors(`${r.kind} ${r.title}`, res.publishablePublish.userErrors);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await publishToOnlineStore();
}
