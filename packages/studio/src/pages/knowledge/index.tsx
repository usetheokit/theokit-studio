import { Badge, Button, EmptyState, Input } from "@usetheo/ui";
import { type FormEvent, useEffect, useState } from "react";
import { ServiceGate } from "../../app/service-state";
import { useDataSource } from "../../data/datasource";
import type { KnowledgeCollection, KnowledgeDocument, RetrievalResult } from "../../data/types";

function KnowledgeBrowser() {
  const ds = useDataSource();
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [selected, setSelected] = useState<KnowledgeCollection | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[] | null>(null);
  const [openDoc, setOpenDoc] = useState<KnowledgeDocument | null>(null);
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState<string | null>(null);
  const [results, setResults] = useState<RetrievalResult[] | null>(null);

  useEffect(() => {
    let ignore = false;
    ds.listCollections().then((list) => {
      if (!ignore) {
        setCollections(list);
      }
    });
    return () => {
      ignore = true;
    };
  }, [ds]);

  const openCollection = async (c: KnowledgeCollection) => {
    setSelected(c);
    setOpenDoc(null);
    setResults(null);
    setDocuments(await ds.listDocuments(c.id));
  };

  const retrieve = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      return;
    }
    // Validação na fronteira (EC do plano): NÃO chama a datasource com input inválido.
    if (query.trim().length === 0) {
      setQueryError("Query vazia — informe um texto de busca.");
      return;
    }
    setQueryError(null);
    setResults(await ds.query(selected.id, query));
  };

  return (
    <div className="mt-4 grid grid-cols-[240px_1fr] gap-6">
      <nav aria-label="collections">
        <ul className="space-y-1">
          {collections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`w-full rounded p-2 text-left hover:bg-white/5 ${
                  selected?.id === c.id ? "bg-white/10" : ""
                }`}
                onClick={() => void openCollection(c)}
              >
                {c.name}
                <span className="ml-2 text-xs opacity-60">
                  {c.documentCount} docs · {c.strategy}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        {selected === null ? (
          <EmptyState
            title="Pick a collection"
            description="Navegue documentos e chunks, ou rode uma retrieval query."
          />
        ) : (
          <>
            <form onSubmit={retrieve} className="flex items-end gap-2">
              <Input
                type="search"
                aria-label="Query"
                placeholder={`Retrieval em ${selected.name}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit">Retrieve</Button>
            </form>
            {queryError && (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {queryError}
              </p>
            )}
            {results && (
              <ol className="mt-4 space-y-2">
                {results.map((r) => (
                  <li
                    key={r.chunkId}
                    data-testid="retrieval-result"
                    className="rounded border border-white/10 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge>
                        score <span data-testid="score">{r.score.toFixed(2)}</span>
                      </Badge>
                      <span className="text-xs opacity-60">{r.strategy}</span>
                    </div>
                    <p className="mt-2 text-sm">{r.excerpt}</p>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-6">
              {documents !== null && documents.length === 0 ? (
                <EmptyState
                  title="No documents in this collection"
                  description="Ingira documentos via theo-rag para vê-los aqui."
                />
              ) : (
                <ul className="space-y-1">
                  {(documents ?? []).map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className="w-full rounded p-2 text-left hover:bg-white/5"
                        onClick={() => setOpenDoc(d)}
                      >
                        {d.name}
                        <span className="ml-2 text-xs opacity-60">{d.chunks.length} chunks</span>
                      </button>
                      {openDoc?.id === d.id && (
                        <ol className="mt-1 ml-4 space-y-1">
                          {d.chunks.map((ch) => (
                            <li
                              key={ch.id}
                              data-testid="chunk-row"
                              className="rounded border border-white/10 p-2 text-sm opacity-90"
                            >
                              {ch.text}
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function KnowledgePage() {
  return (
    <section className="p-6">
      <h1 className="text-xl font-semibold">Knowledge</h1>
      <p className="mt-1 text-sm opacity-70">
        Collections, documentos e retrieval playground do theo-rag (fixtures no M5).
      </p>
      <ServiceGate service="rag">
        <KnowledgeBrowser />
      </ServiceGate>
    </section>
  );
}
