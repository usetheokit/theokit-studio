// Player genérico de roteiros (ADR D3): async generator com delay controlável e
// cancelamento por AbortSignal. SEM dependência de fixtures/metrics (fronteira — SEPA).

export interface PlayOptions {
  /** Delay fixo entre eventos; quando ausente, usa o delta de `at` (clamp ≥ 0 — EC-3). */
  delayMs?: number;
  signal?: AbortSignal;
}

const sleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

export async function* play<E>(
  script: readonly { at: number; event: E }[],
  options: PlayOptions = {},
): AsyncGenerator<E, void, undefined> {
  const { delayMs, signal } = options;
  // EC-4: signal já abortado → zero yields, retorno limpo (nunca throw).
  if (signal?.aborted) {
    return;
  }
  let previousAt = 0;
  for (const item of script) {
    const wait = Math.max(0, delayMs ?? item.at - previousAt);
    previousAt = item.at;
    await sleep(wait);
    if (signal?.aborted) {
      return;
    }
    yield item.event;
  }
}
