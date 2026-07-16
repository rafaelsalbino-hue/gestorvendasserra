import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useDashboardData, type PeriodoDashboard } from "@/hooks/useDashboardData";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { FunilConversao } from "@/components/dashboard/FunilConversao";
import { ContratosPorEntidade } from "@/components/dashboard/ContratosPorEntidade";
import { ValorPorMes } from "@/components/dashboard/ValorPorMes";
import { SlaRiscoTable } from "@/components/dashboard/SlaRiscoTable";

const PERIODOS: { value: PeriodoDashboard; label: string }[] = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
];

function initials(nome?: string) {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { currentUser } = useCurrentUser();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("30d");
  const { data, isLoading } = useDashboardData(periodo);
  const contratos = data?.contratos ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão Geral</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoDashboard)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentUser && (
              <div className="flex items-center gap-2 pl-3 border-l">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(currentUser.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">{currentUser.nome}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{currentUser.funcao}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <KpiCards contratos={contratos} isLoading={isLoading} />

        {/* Funil + Entidade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FunilConversao contratos={contratos} isLoading={isLoading} />
          <ContratosPorEntidade contratos={contratos} isLoading={isLoading} />
        </div>

        {/* Valor + SLA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ValorPorMes contratos={contratos} isLoading={isLoading} />
          <SlaRiscoTable contratos={contratos} isLoading={isLoading} />
        </div>
      </div>
    </AppLayout>
  );
}