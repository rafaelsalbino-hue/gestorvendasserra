import { Inbox } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ETAPAS } from "@/types/contracts";
import { KanbanCard } from "./KanbanCard";
import { ETAPA_COLORS } from "./statusConfig";

type Contrato = Tables<"contratos"> & {
  status_negociacao?: string | null;
  responsavel_nome?: string | null;
};

interface Props {
  contratos: Contrato[];
  onOpen: (c: Contrato) => void;
}

export function KanbanBoard({ contratos, onOpen }: Props) {
  const byEtapa = (id: string) => contratos.filter((c) => c.etapa_atual === id);

  return (
    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(220px, 1fr))` }}
      >
        {ETAPAS.map((etapa) => {
          const items = byEtapa(etapa.id);
          const total = items.reduce(
            (acc, c) => acc + Number(c.valor_total_contrato ?? c.valor ?? 0),
            0,
          );
          const color = ETAPA_COLORS[etapa.id] ?? "#64748b";
          return (
            <div key={etapa.id} className="space-y-2 min-w-[220px]">
              <div
                className="rounded-md bg-card border border-border/60 px-2.5 py-2 shadow-sm"
                style={{ borderTop: `3px solid ${color}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase text-xs truncate">
                    {etapa.label}
                  </span>
                  <span className="text-[10px] rounded-full bg-primary/10 text-primary font-semibold px-2 py-0.5 tabular-nums">
                    {items.length}
                  </span>
                </div>
                {total > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    R$ {total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </div>
                )}
              </div>
              <div className="space-y-2 min-h-[100px] rounded-lg bg-muted/30 border border-border/40 p-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-6 gap-1.5">
                    <Inbox className="h-5 w-5 opacity-50" />
                    <p className="text-[11px]">Sem itens</p>
                  </div>
                ) : (
                  items.map((c) => (
                    <KanbanCard key={c.id} contrato={c} onOpen={() => onOpen(c)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}