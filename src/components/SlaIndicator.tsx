import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface SlaIndicatorProps {
  etapaUpdatedAt: string;
  compact?: boolean;
  /** Quando informado, sobrescreve etapaUpdatedAt no cálculo de dias parado. */
  ultimaMovimentacaoAt?: string | null;
  /** Limite (em dias) acima do qual o card fica em "Atrasado". Default 7. */
  limit?: number;
  /** Texto curto exibido no tooltip (ex: nome do autor da última movimentação). */
  tooltipExtra?: string;
}

function getDays(iso: string): number {
  const updated = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function getSlaColor(days: number, limit: number): { bg: string; text: string; label: string } {
  const half = Math.max(1, Math.floor(limit / 2));
  if (days <= half) return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "No prazo" };
  if (days <= limit) return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Atenção" };
  return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Atrasado" };
}

export function SlaIndicator({ etapaUpdatedAt, compact = false, ultimaMovimentacaoAt, limit = 7, tooltipExtra }: SlaIndicatorProps) {
  const ref = ultimaMovimentacaoAt || etapaUpdatedAt;
  const days = getDays(ref);
  const sla = getSlaColor(days, limit);
  const tooltip = `${days}d sem movimentação${tooltipExtra ? ` · ${tooltipExtra}` : ""}`;

  if (compact) {
    if (days === 0) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${sla.text}`} title={tooltip}>
        <Clock className="h-3 w-3" />
        {days}d
      </span>
    );
  }

  return (
    <Badge variant="outline" className={`${sla.bg} ${sla.text} border-0 text-[10px] gap-1`} title={tooltip}>
      <Clock className="h-3 w-3" />
      {days}d — {sla.label}
    </Badge>
  );
}
