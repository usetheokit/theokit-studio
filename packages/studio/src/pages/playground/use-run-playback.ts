import { useCallback, useEffect, useRef, useState } from "react";
import { useRunLogOptional } from "../../app/run-log";
import { useDataSource } from "../../data/datasource";
import { applyEvent, initialPlayback, type PlaybackState, type StudioEvent } from "./event-to-part";

export interface RunPlayback {
  state: PlaybackState;
  rawEvents: readonly StudioEvent[];
  send(agentId: string, prompt: string): void;
}

// Hook do playground (D3): consome o async iterable do runAgent com AbortController
// atado ao unmount; novo send aborta o run anterior (sem interleaving de estado).
export function useRunPlayback(): RunPlayback {
  const ds = useDataSource();
  const runLog = useRunLogOptional();
  const [state, setState] = useState<PlaybackState>(initialPlayback);
  const [rawEvents, setRawEvents] = useState<readonly StudioEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const send = useCallback(
    (agentId: string, prompt: string) => {
      // EC-1: envio em branco/sem agente é no-op — nenhum run inicia.
      if (agentId.length === 0 || prompt.trim().length === 0) {
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({
        parts: [{ seq: 0, kind: "user", text: prompt }],
        isRunning: true,
        nextSeq: 1,
      });
      setRawEvents([]);
      runLog?.startRun();
      void (async () => {
        for await (const event of ds.runAgent(agentId, prompt, controller.signal)) {
          if (controller.signal.aborted) {
            return;
          }
          setState((s) => applyEvent(s, event));
          setRawEvents((evts) => [...evts, event]);
          runLog?.append(event);
        }
        if (!controller.signal.aborted) {
          setState((s) => ({ ...s, isRunning: false }));
        }
      })();
    },
    [ds, runLog],
  );

  return { state, rawEvents, send };
}
