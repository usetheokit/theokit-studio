import type { KnowledgeCollection, KnowledgeDocument, RetrievalResult } from "../types";

export const fixtureCollections: readonly KnowledgeCollection[] = Object.freeze([
  { id: "docs", name: "Product Docs", documentCount: 2, strategy: "hybrid" },
  { id: "faqs", name: "Support FAQs", documentCount: 1, strategy: "semantic" },
  // Collection vazia — exercita o EmptyState local do T4.2 (EC-6).
  { id: "changelog", name: "Release Notes", documentCount: 0, strategy: "semantic" },
]);

export const fixtureDocuments: Readonly<Record<string, readonly KnowledgeDocument[]>> =
  Object.freeze({
    docs: [
      {
        id: "doc-getting-started",
        name: "getting-started.md",
        chunks: [
          { id: "gs-1", text: "Install the CLI with pnpm add -g theokit and run theokit dev." },
          { id: "gs-2", text: "Studio opens at /_studio inside the dev server." },
          { id: "gs-3", text: "Agents are registered in the @theokit/sdk registry, in code." },
        ],
      },
      {
        id: "doc-memory-guide",
        name: "memory-guide.md",
        chunks: [
          { id: "mg-1", text: "theo-memory stores memories scoped as user/session/agent." },
          { id: "mg-2", text: "The @usetheo/memory/theokit binding wires memory into the agent." },
        ],
      },
    ],
    faqs: [
      {
        id: "doc-faq-billing",
        name: "billing-faq.md",
        chunks: [
          { id: "fb-1", text: "Refunds above $500 require human approval." },
          { id: "fb-2", text: "Plan upgrades are applied immediately." },
        ],
      },
    ],
    changelog: [],
  });

export const fixtureRetrievalResults: readonly RetrievalResult[] = Object.freeze([
  {
    chunkId: "mg-1",
    documentId: "doc-memory-guide",
    score: 0.92,
    excerpt: "theo-memory stores memories scoped as user/session/agent.",
    strategy: "hybrid",
  },
  {
    chunkId: "gs-3",
    documentId: "doc-getting-started",
    score: 0.81,
    excerpt: "Agents are registered in the @theokit/sdk registry, in code.",
    strategy: "hybrid",
  },
  {
    chunkId: "fb-1",
    documentId: "doc-faq-billing",
    score: 0.64,
    excerpt: "Refunds above $500 require human approval.",
    strategy: "hybrid",
  },
]);
