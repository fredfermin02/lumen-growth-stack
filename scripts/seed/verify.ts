import { gql } from "./client.ts";

const Q = `
query Verify {
  shopAll: collectionByHandle(handle: "shop-all") {
    title productsCount { count } products(first: 20) { nodes { title handle } }
  }
  focus: collectionByHandle(handle: "focus-energy") {
    title productsCount { count } products(first: 20) { nodes { title handle } }
  }
  calm: collectionByHandle(handle: "calm-bloom") {
    title productsCount { count } products(first: 20) { nodes { title handle } }
  }
}`;

const data = await gql<{
  shopAll: { title: string; productsCount: { count: number }; products: { nodes: Array<{ title: string }> } };
  focus: { title: string; productsCount: { count: number }; products: { nodes: Array<{ title: string }> } };
  calm: { title: string; productsCount: { count: number }; products: { nodes: Array<{ title: string }> } };
}>(Q);

for (const c of [data.shopAll, data.focus, data.calm]) {
  console.log(`${c.title}: ${c.productsCount.count} products`);
  for (const p of c.products.nodes) console.log(`  • ${p.title}`);
}
