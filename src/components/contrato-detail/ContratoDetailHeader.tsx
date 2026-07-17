import { Badge } from "@/components/ui/badge";
import { KanbanStatusDropdown } from "@/components/kanban/KanbanStatusDropdown";
import { ETAPA_COLORS, ENTIDADE_BADGE } from "@/components/kanban/statusConfig";
import { ETAPAS } from "@/types/contracts";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

function formatCNPJ(cnpj?: string | null) {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function ContratoDetailHeader({ contrato }: { contrato: Contrato }) {
  const entidade = (contrato as any).entidade as string | null;
  const subdivisao = (contrato as any).subdivisao as string | null;
  const etapa = (contrato as any).etapa_atual as string;
  const etapaLabel = ETAPAS.find((e) => e.id === etapa)?.label ?? etapa;
  const dotColor = ETAPA_COLORS[etapa] ?? "#64748b";
  const entBadge =
    ENTIDADE_BADGE[entidade ?? ""] ??
    "bg-muted text-muted-foreground";

  return (
    <div className="flex items-start justify-between gap-4 pb-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold truncate leading-tight">{contrato.cliente}</h2>
        {contrato.cnpj && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatCNPJ(contrato.cnpj)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {entidade && (
            <Badge variant="outline" className={`text-xs border ${entBadge}`}>
              {entidade === "SESI" ? "SESI Educação" : entidade}
            </Badge>
          )}
          {subdivisao && (
            <Badge variant="secondary" className="text-xs">
              {subdivisao}
            </Badge>
          )}
          {(contrato as any).unidade_atendimento && (
            <Badge variant="outline" className="text-xs">
              {(contrato as any).unidade_atendimento}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="w-56">
          <KanbanStatusDropdown
            contratoId={contrato.id}
            etapaAtual={etapa}
            statusAtual={(contrato as any).status_negociacao}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-muted-foreground">Etapa:</span>
          <span className="font-medium">{etapaLabel}</span>
        </div>
      </div>
    </div>
  );
}