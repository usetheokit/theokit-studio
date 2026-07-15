import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { StudioEvent } from "../data/types";

interface RunLog {
  events: readonly StudioEvent[];
  append(event: StudioEvent): void;
  startRun(): void;
}

const RunLogContext = createContext<RunLog | null>(null);

// Guarda os eventos crus do ÚLTIMO run (SEPA: "last run", não "live" — abort-on-unmount
// encerra o stream ao navegar). Montado ACIMA das rotas para sobreviver à navegação.
export function RunLogProvider({
  children,
  initialEvents = [],
}: {
  children: ReactNode;
  initialEvents?: readonly StudioEvent[];
}) {
  const [events, setEvents] = useState<readonly StudioEvent[]>(initialEvents);
  const append = useCallback((event: StudioEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);
  const startRun = useCallback(() => {
    setEvents([]);
  }, []);
  const value = useMemo(() => ({ events, append, startRun }), [events, append, startRun]);
  return <RunLogContext.Provider value={value}>{children}</RunLogContext.Provider>;
}

// Null-safe por design: o playground publica QUANDO o provider existe (testes de página
// isolados não precisam montá-lo).
export function useRunLogOptional(): RunLog | null {
  return useContext(RunLogContext);
}

export function useRunLog(): RunLog {
  const log = useRunLogOptional();
  if (!log) {
    throw new Error("useRunLog: no RunLogProvider mounted — wrap the tree at the composition root");
  }
  return log;
}
