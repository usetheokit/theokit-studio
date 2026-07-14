import { Badge, Button, EmptyState, Input } from "@usetheo/ui";
import { FolderOpen } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getSurface } from "../../app/nav-items";
import { PageHeader } from "../../app/page-header";
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
  const [pageError, setPageError] = useState<string | null>(null);
  const [results, setResults] = useState<RetrievalResult[] | null>(null);

  const boundary = (error: unknown) => {
    // Fronteira de página (F-dom-2): erro tipado da datasource vira estado visível.
    setPageError(error instanceof Error ? error.message : String(error));
  };

  useEffect(() => {
    let ignore = false;
    ds.listCollections()
      .then((list) => {
        if (!ignore) {
          setCollections(list);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setPageError(error instanceof Error ? error.message : String(error));
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
    setPageError(null);
    try {
      setDocuments(await ds.listDocuments(c.id));
    } catch (error) {
      boundary(error);
    }
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
    try {
      setResults(await ds.query(selected.id, query));
    } catch (error) {
      boundary(error);
    }
  };

  return (
    <div className="mt-4 grid grid-cols-[240px_1fr] gap-6">
      {pageError && (
        <p role="alert" className="col-span-2 text-sm text-red-400">
          {pageError}
        </p>
      )}
      <nav aria-label="collections">
        <ul className="space-y-1">
          {collections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                  selected?.id === c.id
                    ? "border border-primary/30 bg-primary/10 text-foreground"
                    : "border border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
                onClick={() => void openCollection(c)}
              >
                <FolderOpen
                  className={`size-4 shrink-0 ${selected?.id === c.id ? "text-primary" : "text-muted-foreground/70"}`}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-sm">{c.name}</span>
                  <span className="block text-muted-foreground text-xs">
                    {c.documentCount} docs · {c.strategy}
                  </span>
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
                        className="w-full rounded-lg border border-border/40 bg-card/60 px-3 py-2 text-left transition-colors hover:border-border"
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

const surface = getSurface("/knowledge");

export function KnowledgePage() {
  return (
    <section>
      <PageHeader icon={surface.icon} title="Knowledge" description={surface.description} />
      <div className="px-8 py-6">
        <ServiceGate service="rag">
          <KnowledgeBrowser />
        </ServiceGate>
      </div>
    </section>
  );
}
