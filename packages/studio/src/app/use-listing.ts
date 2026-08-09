import { useEffect, useRef, useState } from "react";
import { type StudioDataSource, useDataSource } from "../data/datasource";

// One piece of listing-load boilerplate (DRY — Rule of 3: Agents/Memory/Knowledge already
// repeated the same useEffect with an ignore flag; the Mastra-parity screens would be the
// fourth copy). Page boundary: a typed error becomes visible state, never an unhandled
// rejection.
export function useListing<T>(load: (ds: StudioDataSource) => Promise<T[]>): {
  items: T[];
  loadError: string | null;
} {
  const ds = useDataSource();
  const [items, setItems] = useState<T[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let ignore = false;
    loadRef
      .current(ds)
      .then((list) => {
        if (!ignore) {
          setItems(list);
          // A load that succeeds after one that failed has to clear the alert; without this the error
          // banner stays on screen next to the new items (review F-arch-9).
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      ignore = true;
    };
  }, [ds]);

  return { items, loadError };
}
