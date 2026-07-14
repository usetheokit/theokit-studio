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
          { id: "gs-1", text: "Instale o CLI com pnpm add -g theokit e rode theokit dev." },
          { id: "gs-2", text: "O Studio abre em /_studio dentro do dev server." },
          { id: "gs-3", text: "Agents são registrados no @theokit/sdk registry em código." },
        ],
      },
      {
        id: "doc-memory-guide",
        name: "memory-guide.md",
        chunks: [
          { id: "mg-1", text: "theo-memory guarda memórias com escopo user/session/agent." },
          { id: "mg-2", text: "O binding @usetheo/memory/theokit liga a memória ao agente." },
        ],
      },
    ],
    faqs: [
      {
        id: "doc-faq-billing",
        name: "billing-faq.md",
        chunks: [
          { id: "fb-1", text: "Reembolsos acima de R$ 500 exigem aprovação humana." },
          { id: "fb-2", text: "Upgrades de plano são aplicados imediatamente." },
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
    excerpt: "theo-memory guarda memórias com escopo user/session/agent.",
    strategy: "hybrid",
  },
  {
    chunkId: "gs-3",
    documentId: "doc-getting-started",
    score: 0.81,
    excerpt: "Agents são registrados no @theokit/sdk registry em código.",
    strategy: "hybrid",
  },
  {
    chunkId: "fb-1",
    documentId: "doc-faq-billing",
    score: 0.64,
    excerpt: "Reembolsos acima de R$ 500 exigem aprovação humana.",
    strategy: "hybrid",
  },
]);
