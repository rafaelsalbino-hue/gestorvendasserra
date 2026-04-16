import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface SlaIndicatorProps {
  etapaUpdatedAt: string;
  compact?: boolean;
}

function getDaysInStage(etapaUpdatedAt: string): number {
  const updated = new Date(etapaUpdatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function getSlaColor(days: number): { bg: string; text: string; label: string } {
  if (days <= 3) return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "No prazo" };
  if (days <= 7) return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Atenção" };
  return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Atrasado" };
}

export function SlaIndicator({ etapaUpdatedAt, compact = false }: SlaIndicatorProps) {
  const days = getDaysInStage(etapaUpdatedAt);
  const sla = getSlaColor(days);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${sla.text}`} title={`${days}d na etapa`}>
        <Clock className="h-3 w-3" />
        {days}d
      </span>
    );
  }

  return (
    <Badge variant="outline" className={`${sla.bg} ${sla.text} border-0 text-[10px] gap-1`}>
      <Clock className="h-3 w-3" />
      {days}d — {sla.label}
    </Badge>
  );
}
