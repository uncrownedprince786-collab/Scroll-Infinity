// Curated seed set. This is NOT fabricated content — it is a hand-picked list
// of high-value, stable Wikipedia article titles across a handful of topics.
// The ingest pipeline resolves each title to real Wikidata/Wikipedia data at
// run time (titles are resolved through the Action API with redirects enabled,
// so exact casing beyond the first character is not required).

export interface SeedTopic {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface SeedEntity {
  /** English Wikipedia article title. */
  title: string;
  /** Optional display-name override (defaults to the resolved page title). */
  name?: string;
  /** Topic slugs this entity belongs to. */
  topics: string[];
}

export const seedTopics: SeedTopic[] = [
  {
    slug: "space",
    name: "Space",
    description:
      "Planets, moons, stars, spacecraft, and the phenomena that map our universe.",
    sortOrder: 1,
  },
  {
    slug: "science",
    name: "Science",
    description:
      "The concepts, discoveries, and natural laws that explain how the world works.",
    sortOrder: 2,
  },
  {
    slug: "technology",
    name: "Technology",
    description:
      "The systems and inventions reshaping how humanity computes, connects, and builds.",
    sortOrder: 3,
  },
  {
    slug: "geography",
    name: "Geography",
    description:
      "Countries, landmarks, rivers, and the physical features that define our planet.",
    sortOrder: 4,
  },
  {
    slug: "nature",
    name: "Nature",
    description:
      "Living things and ecosystems, from the largest animals to the most fragile habitats.",
    sortOrder: 5,
  },
  {
    slug: "history",
    name: "History",
    description:
      "The civilizations, movements, and turning points that shaped the modern world.",
    sortOrder: 6,
  },
];

export const seedEntities: SeedEntity[] = [
  // Space
  { title: "Sun", topics: ["space", "science"] },
  { title: "Moon", topics: ["space"] },
  { title: "Mars", topics: ["space"] },
  { title: "Jupiter", topics: ["space"] },
  { title: "Saturn", topics: ["space"] },
  { title: "Milky Way", topics: ["space"] },
  { title: "Black hole", topics: ["space", "science"] },
  { title: "International Space Station", topics: ["space", "technology"] },
  // Science
  { title: "DNA", topics: ["science"] },
  { title: "Photosynthesis", topics: ["science", "nature"] },
  { title: "Periodic table", topics: ["science"] },
  { title: "Theory of relativity", topics: ["science"] },
  { title: "Evolution", topics: ["science", "nature"] },
  { title: "Vaccine", topics: ["science"] },
  // Technology
  { title: "Internet", topics: ["technology"] },
  { title: "Artificial intelligence", topics: ["technology", "science"] },
  { title: "Semiconductor", topics: ["technology"] },
  { title: "World Wide Web", topics: ["technology"] },
  { title: "Quantum computing", topics: ["technology", "science"] },
  { title: "Blockchain", topics: ["technology"] },
  // Geography
  { title: "Japan", topics: ["geography"] },
  { title: "Brazil", topics: ["geography"] },
  { title: "Canada", topics: ["geography"] },
  { title: "Egypt", topics: ["geography", "history"] },
  { title: "Iceland", topics: ["geography"] },
  { title: "Mount Everest", topics: ["geography", "nature"] },
  { title: "Amazon River", topics: ["geography", "nature"] },
  { title: "Sahara", topics: ["geography", "nature"] },
  // Nature
  { title: "Blue whale", topics: ["nature"] },
  { title: "Amazon rainforest", topics: ["nature", "geography"] },
  { title: "Coral reef", topics: ["nature"] },
  { title: "Great Barrier Reef", topics: ["nature", "geography"] },
  { title: "Tiger", topics: ["nature"] },
  { title: "Honey bee", topics: ["nature"] },
  // History
  { title: "Roman Empire", topics: ["history"] },
  { title: "Renaissance", topics: ["history"] },
  { title: "Industrial Revolution", topics: ["history"] },
  { title: "Great Wall of China", topics: ["history", "geography"] },
  { title: "Apollo 11", topics: ["history", "space"] },
];
