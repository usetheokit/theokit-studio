import { useEffect, useRef, useState } from "react";
import { type StudioDataSource, useDataSource } from "../data/datasource";

// Boilerplate único de carga de listagem (DRY — Regra de 3: Agents/Memory/Knowledge já
// repetiam o mesmo useEffect com ignore-flag; as telas Mastra-parity seriam a 4ª cópia).
// Fronteira de página: erro tipado vira estado visível, nunca unhandled rejection.
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
