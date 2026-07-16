import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import type { ContratoDash } from "@/hooks/useDashboardData";
import { formatBRLCompact } from "@/hooks/useDashboardData";

interface KpiCardsProps {
  contratos: ContratoDash[];
  isLoading: boolean;
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function KpiCards({ contratos, isLoading }: KpiCardsProps) {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const ativos = contratos.filter((c) => !c.deleted_at && c.etapa_atual !== "finalizado" && !c.finalized_at);
  const totalPipeline = ativos.reduce((sum, c) => sum + Number(c.valor_total_contrato || c.valor || 0), 0);
  const slaRisco = ativos.filter((c) => c.etapa_updated_at && daysBetween(now, new Date(c.etapa_updated_at)) > 7).length;
  const finalizadosMes = contratos.filter(
    (c) => c.finalized_at && new Date(c.finalized_at) >= inicioMes
  ).length;

  const ativosMesAtual = contratos.filter(
    (c) => !c.deleted_at && new Date(c.created_at) >= inicioMes
  ).length;
  const ativosMesAnterior = contratos.filter(
    (c) =>
      !c.deleted_at &&
      new Date(c.created_at) >= inicioMesAnterior &&
      new Date(c.created_at) <= fimMesAnterior
  ).length;
  const variacao =
    ativosMesAnterior > 0
      ? ((ativosMesAtual - ativosMesAnterior) / ativosMesAnterior) * 100
      : ativosMesAtual > 0
      ? 100
      : 0;

  const cards = [
    {
      label: "Contratos Ativos",
      value: ativos.length.toLocaleString("pt-BR"),
      badge:
        variacao !== 0
          ? `${variacao > 0 ? "+" : ""}${variacao.toFixed(0)}% vs mês anterior`
          : "estável",
      badgeColor: variacao >= 0 ? "text-emerald-600" : "text-red-600",
      icon: FileText,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    },
    {
      label: "Valor Total Pipeline",
      value: formatBRLCompact(totalPipeline),
      badge: `${ativos.length} contratos ativos`,
      badgeColor: "text-muted-foreground",
      icon: DollarSign,
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
    {
      label: "SLA em Risco",
      value: slaRisco.toLocaleString("pt-BR"),
      badge: slaRisco > 0 ? "Atenção" : "Sob controle",
      badgeColor: slaRisco > 0 ? "text-orange-600" : "text-emerald-600",
      icon: AlertTriangle,
      iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
    },
    {
      label: "Finalizados no Mês",
      value: finalizadosMes.toLocaleString("pt-BR"),
      badge: `desde ${inicioMes.toLocaleDateString("pt-BR")}`,
      badgeColor: "text-muted-foreground",
      icon: CheckCircle,
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6"><Skeleton className="h-20 w-full" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-6 shadow-sm rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${c.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight">{c.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            <div className={`text-xs mt-2 font-medium ${c.badgeColor}`}>{c.badge}</div>
          </Card>
        );
      })}
    </div>
  );
}