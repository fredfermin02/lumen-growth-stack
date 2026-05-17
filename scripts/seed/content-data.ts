export type TestimonialContent = {
  handle: string;
  name: string;
  quote: string;
  rating: number;
  productHandle: "clarity" | "quiet" | "bloom" | "ember";
  category: "athletes" | "wellness" | "festival";
};

export const TESTIMONIALS: TestimonialContent[] = [
  {
    handle: "sarah-k-clarity",
    name: "Sarah K.",
    quote:
      "Replaced my pre-workout coffee with Clarity. The L-theanine smooths out the edges I didn't realize I had — I get the focus without the 11am crash.",
    rating: 5,
    productHandle: "clarity",
    category: "athletes",
  },
  {
    handle: "marcus-t-ember",
    name: "Marcus T.",
    quote:
      "Ember before long rides. Stable energy, no crash at mile 60. The cardamom-blood-orange combination is wild — I look forward to the can almost as much as the ride.",
    rating: 5,
    productHandle: "ember",
    category: "athletes",
  },
  {
    handle: "priya-r-quiet",
    name: "Priya R.",
    quote:
      "Quiet became my 9pm ritual. I sleep deeper, wake up clearer. That's the whole review.",
    rating: 5,
    productHandle: "quiet",
    category: "wellness",
  },
  {
    handle: "dani-m-bloom",
    name: "Dani M.",
    quote:
      "Six weeks of Bloom and my skin has a quiet glow. Not magic — just collagen and a habit I can actually stick to.",
    rating: 4,
    productHandle: "bloom",
    category: "wellness",
  },
  {
    handle: "jordan-l-quiet",
    name: "Jordan L.",
    quote:
      "Brought a 12-pack of Quiet to a festival. My friends stole them all by Saturday. Reordering for next time.",
    rating: 5,
    productHandle: "quiet",
    category: "festival",
  },
  {
    handle: "alex-f-ember",
    name: "Alex F.",
    quote:
      "Lumen at the festival aid stations was perfect. Real ingredients, not just sugar bombs. People kept asking what brand it was.",
    rating: 5,
    productHandle: "ember",
    category: "festival",
  },
];

export type FaqContent = {
  handle: string;
  question: string;
  answer: string;
  category: "Ingredients" | "Shipping" | "Subscription";
};

export const FAQ_ITEMS: FaqContent[] = [
  {
    handle: "what-is-in-these",
    question: "What's actually in these?",
    answer:
      "Functional mushrooms (lion's mane, ashwagandha, reishi, cordyceps), real fruit, sparkling water, and a small amount of cane sugar. Full ingredient lists are on every can and PDP — no proprietary blends.",
    category: "Ingredients",
  },
  {
    handle: "is-caffeine-natural",
    question: "Is the caffeine natural?",
    answer:
      "Yes — green tea (Clarity, 40mg) or green coffee bean (Ember, 95mg). No added isolated caffeine, no taurine, no synthetic stimulants.",
    category: "Ingredients",
  },
  {
    handle: "third-party-tested",
    question: "Are these third-party tested?",
    answer:
      "Every batch is tested by an ISO 17025 lab for ingredient potency and contaminants. We post the certificates of analysis on the product pages.",
    category: "Ingredients",
  },
  {
    handle: "shipping-locations",
    question: "Where do you ship?",
    answer:
      "Currently the contiguous US. Free over $40, $5 flat otherwise. Orders ship within 2 business days from Colorado.",
    category: "Shipping",
  },
  {
    handle: "keeping-cold",
    question: "How do you keep them cold?",
    answer:
      "We don't — they ship and store at room temperature. Refrigerate at home for the best flavor.",
    category: "Shipping",
  },
  {
    handle: "skip-delivery",
    question: "Can I skip a delivery?",
    answer:
      "Yes. Skip or pause any time from your account, no email required. Cancel in two clicks.",
    category: "Subscription",
  },
];

export type ComparisonPointContent = {
  handle: string;
  claim: string;
  ourValue: string;
  competitorValue: string;
  category: "Ingredients" | "Sourcing" | "Packaging";
};

export const COMPARISON_POINTS: ComparisonPointContent[] = [
  {
    handle: "sugar-per-can",
    claim: "Sugar per can",
    ourValue: "5g real cane sugar",
    competitorValue: "26g high-fructose corn syrup",
    category: "Ingredients",
  },
  {
    handle: "caffeine-source",
    claim: "Caffeine source",
    ourValue: "Green tea or green coffee bean",
    competitorValue: "Synthetic caffeine anhydrous",
    category: "Ingredients",
  },
  {
    handle: "functional-dose",
    claim: "Functional ingredient dose",
    ourValue: "500mg+ clinical-grade adaptogen",
    competitorValue: "Marketing-only sprinkle",
    category: "Ingredients",
  },
  {
    handle: "third-party-testing",
    claim: "Third-party tested",
    ourValue: "Every batch, COAs public",
    competitorValue: "Rarely, results unpublished",
    category: "Sourcing",
  },
  {
    handle: "can-material",
    claim: "Packaging",
    ourValue: "70%+ recycled aluminum",
    competitorValue: "Single-use plastic bottle",
    category: "Packaging",
  },
];

export type FeatureContent = {
  handle: string;
  title: string;
  description: string;
};

export const FEATURES: FeatureContent[] = [
  {
    handle: "made-in-usa",
    title: "Made in USA",
    description:
      "Brewed and canned in Colorado. Adaptogens and matcha sourced where they grow best; fruit and sugar sourced domestically.",
  },
  {
    handle: "third-party-tested-feature",
    title: "Third-party tested",
    description:
      "Every batch goes through an ISO 17025 lab for ingredient potency and contaminants. Certificates of analysis are posted on every product page.",
  },
  {
    handle: "sustainable-cans",
    title: "Infinitely recyclable cans",
    description:
      "Aluminum is the most-recycled packaging on earth. Our cans are minimum 70% post-consumer recycled aluminum.",
  },
  {
    handle: "one-percent-planet",
    title: "1% for the planet",
    description:
      "1% of every sale goes to environmental nonprofits via 1% for the Planet. Public quarterly reports.",
  },
  {
    handle: "adaptogen-forward",
    title: "Adaptogen-forward",
    description:
      "Real clinical-grade doses of lion's mane, ashwagandha, reishi, and cordyceps. Not marketing sprinkles.",
  },
];
