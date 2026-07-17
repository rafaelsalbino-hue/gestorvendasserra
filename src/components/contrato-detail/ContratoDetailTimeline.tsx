import { CheckCircle2, Circle } from "lucide-react";
import { ETAPAS } from "@/types/contracts";
import { ETAPA_COLORS } from "@/components/kanban/statusConfig";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";

export function ContratoDetailTimeline({
  contratoId,
  etapaAtual,
}: {
  contratoId: string;
  etapaAtual: string;
}) {
  const { data: historico = [] } = useContratosHistorico(contratoId);
  const idx = ETAPAS.findIndex((e) => e.id === etapaAtual);

  // Mapeia a data mais recente em que cada etapa apareceu como valor_novo
  const etapaDates = new Map<string, string>();
  for (const h of historico as any[]) {
    if ((h.campo === "Etapa Atual" || h.campo === "etapa_atual") && h.valor_novo) {
      const key = String(h.valor_novo);
      if (!etapaDates.has(key)) etapaDates.set(key, h.created_at);
    }
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
        Progresso do Pipeline
      </h3>
      <ol className="relative border-l-2 border-muted pl-4 space-y-3 ml-1">
        {ETAPAS.map((e, i) => {
          const done = i < idx;
          const current = i === idx;
          const dot = ETAPA_COLORS[e.id] ?? "#64748b";
          const at = etapaDates.get(e.id);
          return (
            <li key={e.id} className="relative">
              <span
                className="absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background"
                aria-hidden
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : current ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: dot }}
                  />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </span>
              <div
                className={
                  current
                    ? "rounded-md bg-primary/5 -mx-2 px-2 py-1"
                    : ""
                }
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm ${current ? "font-semibold" : done ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {e.label}
                  </span>
                  {current && (
                    <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      Atual
                    </span>
                  )}
                </div>
                {at && (done || current) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}