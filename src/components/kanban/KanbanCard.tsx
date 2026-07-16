import { Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";
import { ENTIDADE_BADGE } from "./statusConfig";
import { KanbanStatusDropdown } from "./KanbanStatusDropdown";
import { KanbanAdvanceButton } from "./KanbanAdvanceButton";

type Contrato = Tables<"contratos"> & {
  status_negociacao?: string | null;
  responsavel_nome?: string | null;
};

function formatBRL(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

function diasNaEtapa(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function slaBorder(d: number): string {
  if (d < 7) return "border-l-green-500";
  if (d <= 14) return "border-l-yellow-500";
  return "border-l-red-500";
}

function slaDot(d: number): string {
  if (d < 7) return "bg-green-500";
  if (d <= 14) return "bg-yellow-500";
  return "bg-red-500";
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

interface Props {
  contrato: Contrato;
  onOpen: () => void;
}

export function KanbanCard({ contrato, onOpen }: Props) {
  const dias = diasNaEtapa(contrato.etapa_updated_at);
  const valor = contrato.valor_total_contrato ?? contrato.valor;
  const isFinalizado = contrato.etapa_atual === "faturamento" && contrato.finalized_at;
  const entBadge = ENTIDADE_BADGE[contrato.entidade as string] ?? "bg-muted text-muted-foreground";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className={`group relative bg-card rounded-md border border-border/60 border-l-4 ${slaBorder(dias)} p-2.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isFinalizado ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="font-semibold text-sm truncate flex-1" title={contrato.cliente}>
          {contrato.cliente}
        </h4>
        <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${slaDot(dias)}`} title={`${dias}d na etapa`} />
      </div>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${entBadge}`}>
          {contrato.entidade}
        </span>
        {contrato.subdivisao && (
          <span className="text-[10px] text-muted-foreground truncate">
            {contrato.subdivisao}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-medium text-sm tabular-nums">{formatBRL(valor)}</span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {dias}d
        </span>
      </div>

      <div className="mb-2">
        <KanbanStatusDropdown
          contratoId={contrato.id}
          etapaAtual={contrato.etapa_atual as string}
          statusAtual={contrato.status_negociacao ?? null}
        />
      </div>

      <div className="flex items-center justify-between">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
            {initials(contrato.responsavel_nome ?? contrato.ultima_movimentacao_por).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {contrato.etapa_atual !== "faturamento" && (
          <KanbanAdvanceButton contratoId={contrato.id} etapaAtual={contrato.etapa_atual as string} />
        )}
      </div>
    </div>
  );
}