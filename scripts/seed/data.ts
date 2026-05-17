export type Flavor = {
  handle: string;
  title: string;
  vendor: "Lumen";
  productType: "Beverage";
  shortCode: string;
  description: string;
  function: "focus" | "calm" | "beauty" | "energy";
  audience: Array<"athletes" | "wellness" | "festival">;
  caffeineMg: number;
  heroIngredient: string;
  flavorNotes: string;
  tags: string[];
};

export const FLAVORS: Flavor[] = [
  {
    handle: "clarity",
    title: "Clarity",
    vendor: "Lumen",
    productType: "Beverage",
    shortCode: "CLA",
    function: "focus",
    audience: ["athletes", "wellness"],
    caffeineMg: 40,
    heroIngredient: "Lion's mane + L-theanine",
    flavorNotes: "Yuzu, ginger, a clean citrus finish",
    description:
      "Clarity is built for the 10am wall. 500mg of lion's mane mushroom and 200mg of L-theanine pair with a light 40mg of green tea caffeine for steady, jitter-free focus. Yuzu peel and fresh ginger give it a crisp, citrus-forward profile that holds up against your lunch. No sugar, no sweeteners — just function in a can.",
    tags: ["focus", "adaptogen", "low-caffeine"],
  },
  {
    handle: "quiet",
    title: "Quiet",
    vendor: "Lumen",
    productType: "Beverage",
    shortCode: "QUI",
    function: "calm",
    audience: ["wellness", "festival"],
    caffeineMg: 0,
    heroIngredient: "Ashwagandha + magnesium glycinate",
    flavorNotes: "Lavender, lemon, a soft floral tail",
    description:
      "Quiet is your 9pm ritual. 300mg of KSM-66 ashwagandha and 200mg of magnesium glycinate take the edge off without sedating you. Lavender and lemon zest make it taste like the end of a long day. Caffeine-free, sugar-free. Drink it slow.",
    tags: ["calm", "adaptogen", "caffeine-free"],
  },
  {
    handle: "bloom",
    title: "Bloom",
    vendor: "Lumen",
    productType: "Beverage",
    shortCode: "BLO",
    function: "beauty",
    audience: ["wellness"],
    caffeineMg: 0,
    heroIngredient: "Reishi + marine collagen",
    flavorNotes: "Hibiscus, dried rose, a tart finish",
    description:
      "Bloom supports your skin barrier from the inside. 500mg of reishi mushroom and 5g of marine collagen peptides go down with hibiscus, dried rose, and a touch of pomegranate. Tart, floral, never cloying. Best cold over ice — or warm if you're treating it like a tea.",
    tags: ["beauty", "collagen", "caffeine-free"],
  },
  {
    handle: "ember",
    title: "Ember",
    vendor: "Lumen",
    productType: "Beverage",
    shortCode: "EMB",
    function: "energy",
    audience: ["athletes", "festival"],
    caffeineMg: 95,
    heroIngredient: "Cordyceps + B12",
    flavorNotes: "Blood orange, cardamom, warm spice",
    description:
      "Ember is for the back half of a long ride. 1g of cordyceps mushroom and a full daily dose of B12 ride alongside 95mg of green coffee caffeine. Blood orange and cardamom give it a warm, almost sangria-like profile. Pre-workout energy that doesn't taste like a science experiment.",
    tags: ["energy", "adaptogen", "athlete"],
  },
];

export type Variant = { name: "Single can" | "12-pack"; priceUsd: string; suffix: string };

export const VARIANTS: Variant[] = [
  { name: "Single can", priceUsd: "4.50", suffix: "SINGLE" },
  { name: "12-pack", priceUsd: "48.00", suffix: "12PK" },
];

export const COLLECTIONS = [
  {
    handle: "shop-all",
    title: "Shop All",
    descriptionHtml: "<p>The full Lumen lineup.</p>",
    ruleSet: null, // populated manually below — auto: all products
  },
  {
    handle: "focus-energy",
    title: "Focus & Energy",
    descriptionHtml: "<p>For when you need to show up sharp.</p>",
    metafieldFunctionValues: ["focus", "energy"],
  },
  {
    handle: "calm-bloom",
    title: "Calm & Bloom",
    descriptionHtml: "<p>For the slower end of the day.</p>",
    metafieldFunctionValues: ["calm", "beauty"],
  },
] as const;
