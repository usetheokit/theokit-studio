import { EmptyState, Skeleton } from "@usetheo/ui";
import { type ReactNode, useEffect, useState } from "react";
import { useDataSource } from "../data/datasource";
import { metrics } from "../data/metrics";
import type { ServiceName } from "../data/types";

const SERVICE_LABEL: Record<ServiceName, string> = {
  memory: "theo-memory",
  lens: "theo-lens",
  rag: "theo-rag",
  // O próprio dev server/reflection (M1 EC-3) — Record total exige a chave.
  studio: "studio dev server",
};

export function ServiceOfflineState({ service }: { service: ServiceName }) {
  return (
    <EmptyState
      data-testid="service-offline"
      eyebrow={SERVICE_LABEL[service]}
      title={`${SERVICE_LABEL[service]} is offline`}
      description={
        <>
          Bring the data stack up with <code>theokit studio up</code> to enable this tab. Studio
          stays functional without Docker (graceful degradation).
        </>
      }
    />
  );
}

type HealthState = "pending" | "online" | "offline";

// Estado de saúde por serviço (invariante 4 do CLAUDE.md). Rejeição de health() é
// capturada AQUI (nunca unhandled) e vira offline + métrica (fail-clear, Rule 8).
// TODO(M1): timeout de health é concern do adapter real (EC-9 — aceito no plano).
export function useServiceHealth(service: ServiceName): HealthState {
  const ds = useDataSource();
  const [state, setState] = useState<HealthState>("pending");
  useEffect(() => {
    let ignore = false;
    ds.health()
      .then((map) => {
        if (!ignore) {
          setState(map[service].status);
        }
      })
      .catch(() => {
        metrics.increment("health_errors_total");
        if (!ignore) {
          setState("offline");
        }
      });
    return () => {
      ignore = true;
    };
  }, [ds, service]);
  return state;
}

export function ServiceGate({ service, children }: { service: ServiceName; children: ReactNode }) {
  const health = useServiceHealth(service);
  if (health === "pending") {
    return <Skeleton data-testid="service-skeleton" className="m-6 h-32" />;
  }
  if (health === "offline") {
    return <ServiceOfflineState service={service} />;
  }
  return <>{children}</>;
}
