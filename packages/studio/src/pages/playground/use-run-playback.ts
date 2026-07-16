import { useCallback, useEffect, useRef, useState } from "react";
import { useRunLogOptional } from "../../app/run-log";
import type { RunAgentParams } from "../../data/datasource";
import { useDataSource } from "../../data/datasource";
import { applyEvent, initialPlayback, type PlaybackState } from "./event-to-part";

export interface RunPlayback {
  state: PlaybackState;
  send(agentId: string, prompt: string, params?: RunAgentParams): void;
}

// Hook do playground (D3): consome o async iterable do runAgent com AbortController
// atado ao unmount; novo send aborta o run anterior (sem interleaving de estado).
// Erro no stream vira NoticePart visível + isRunning=false (review F-dom-3 — o M1 real
// pode rejeitar mid-run; nunca deixar o botão travado nem unhandled rejection).
export function useRunPlayback(): RunPlayback {
  const ds = useDataSource();
  const runLog = useRunLogOptional();
  const [state, setState] = useState<PlaybackState>(initialPlayback);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const send = useCallback(
    (agentId: string, prompt: string, params?: RunAgentParams) => {
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
      runLog?.startRun();
      void (async () => {
        try {
          for await (const event of ds.runAgent(agentId, prompt, controller.signal, params)) {
            if (controller.signal.aborted) {
              return;
            }
            setState((s) => applyEvent(s, event));
            runLog?.append(event);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            const detail = error instanceof Error ? error.message : String(error);
            setState((s) => ({
              ...s,
              nextSeq: s.nextSeq + 1,
              parts: [
                ...s.parts,
                { seq: s.nextSeq, kind: "notice", notice: "stream-error", detail },
              ],
            }));
          }
        } finally {
          if (!controller.signal.aborted) {
            setState((s) => ({ ...s, isRunning: false }));
          }
        }
      })();
    },
    [ds, runLog],
  );

  return { state, send };
}
