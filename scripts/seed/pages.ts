import { gql, logUserErrors, type UserError } from "./client.ts";

type PageDef = {
  handle: string;
  title: string;
  templateSuffix: string;
  bodyHtml: string;
};

const PAGES: PageDef[] = [
  {
    handle: "lp-athletes",
    title: "For athletes",
    templateSuffix: "lp-athletes",
    bodyHtml: "<p>Lumen — built for athletes.</p>",
  },
  {
    handle: "lp-wellness",
    title: "Everyday wellness",
    templateSuffix: "lp-wellness",
    bodyHtml: "<p>Lumen — your daily ritual.</p>",
  },
  {
    handle: "lp-festival",
    title: "Festival edition",
    templateSuffix: "lp-festival",
    bodyHtml: "<p>Lumen — for the long weekend.</p>",
  },
];

const PAGE_BY_HANDLE = `
query PageByHandle($query: String!) {
  pages(first: 1, query: $query) {
    nodes { id handle templateSuffix }
  }
}`;

const PAGE_CREATE = `
mutation PageCreate($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page { id handle templateSuffix }
    userErrors { field message code }
  }
}`;

const PAGE_UPDATE = `
mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
  pageUpdate(id: $id, page: $page) {
    page { id handle templateSuffix }
    userErrors { field message code }
  }
}`;

export async function seedPages() {
  console.log("→ Seeding LP pages");
  for (const p of PAGES) {
    const found = await gql<{
      pages: { nodes: Array<{ id: string; handle: string; templateSuffix: string | null }> };
    }>(PAGE_BY_HANDLE, { query: `handle:${p.handle}` });

    const existing = found.pages.nodes[0];

    if (existing) {
      if (existing.templateSuffix === p.templateSuffix) {
        console.log(`  ↳ ${p.handle} already exists with correct template, skipping`);
        continue;
      }
      const res = await gql<{
        pageUpdate: {
          page: { id: string; handle: string; templateSuffix: string | null } | null;
          userErrors: UserError[];
        };
      }>(PAGE_UPDATE, {
        id: existing.id,
        page: { templateSuffix: p.templateSuffix },
      });
      if (res.pageUpdate.page) {
        console.log(`  ✓ ${p.handle} (template suffix updated → ${p.templateSuffix})`);
      } else {
        logUserErrors(p.handle, res.pageUpdate.userErrors);
      }
      continue;
    }

    const res = await gql<{
      pageCreate: {
        page: { id: string; handle: string } | null;
        userErrors: UserError[];
      };
    }>(PAGE_CREATE, {
      page: {
        handle: p.handle,
        title: p.title,
        templateSuffix: p.templateSuffix,
        body: p.bodyHtml,
        isPublished: true,
      },
    });
    if (res.pageCreate.page) {
      console.log(`  ✓ ${p.handle} → /pages/${p.handle}`);
    } else {
      logUserErrors(p.handle, res.pageCreate.userErrors);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedPages();
}
