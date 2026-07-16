import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useDashboardData, type PeriodoDashboard } from "@/hooks/useDashboardData";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { FunilConversao } from "@/components/dashboard/FunilConversao";
import { ContratosPorEntidade } from "@/components/dashboard/ContratosPorEntidade";
import { ValorPorMes } from "@/components/dashboard/ValorPorMes";
import { SlaRiscoTable } from "@/components/dashboard/SlaRiscoTable";
import { DashboardFilters, DEFAULT_FILTERS, type DashFilters } from "@/components/dashboard/DashboardFilters";
import { SituacoesVerificar } from "@/components/dashboard/SituacoesVerificar";

function initials(nome?: string) {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function inicioPeriodo(p: DashFilters["periodo"]): Date | null {
  if (p === "todos") return null;
  const now = new Date();
  if (p === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "ano") return new Date(now.getFullYear(), 0, 1);
  const dias = p === "30d" ? 30 : p === "60d" ? 60 : 90;
  const d = new Date(now); d.setDate(d.getDate() - dias); return d;
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { currentUser } = useCurrentUser();
  const [filters, setFilters] = useState<DashFilters>(DEFAULT_FILTERS);
  // Sempre buscamos "ano" e filtramos client-side pelo período escolhido para
  // permitir cálculo de variação mês a mês independente do período do filtro.
  const { data, isLoading } = useDashboardData("ano" as PeriodoDashboard);
  const contratosAll = data?.contratos ?? [];

  const contratos = useMemo(() => {
    const inicio = inicioPeriodo(filters.periodo);
    return contratosAll.filter((c) => {
      if (inicio && new Date(c.created_at) < inicio) return false;
      if (filters.entidade !== "todas" && c.entidade !== filters.entidade) return false;
      if (filters.subdivisao !== "todas" && c.subdivisao !== filters.subdivisao) return false;
      if (filters.etapa !== "todas" && c.etapa_atual !== filters.etapa) return false;
      return true;
    });
  }, [contratosAll, filters]);

  const filtroQS = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.entidade !== "todas") p.set("entidade", filters.entidade);
    if (filters.subdivisao !== "todas") p.set("subdivisao", filters.subdivisao);
    if (filters.etapa !== "todas") p.set("etapa", filters.etapa);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [filters]);

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão Geral</p>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
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

        {/* Filtros */}
        <DashboardFilters filters={filters} onChange={setFilters} />

        {/* KPIs */}
        <KpiCards contratos={contratos} isLoading={isLoading} filtroQS={filtroQS} />

        {/* Funil + Entidade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FunilConversao contratos={contratos} isLoading={isLoading} filtroQS={filtroQS} />
          <ContratosPorEntidade
            contratos={contratos}
            isLoading={isLoading}
            onSelectEntidade={(e) => setFilters({ ...filters, entidade: e, subdivisao: "todas" })}
          />
        </div>

        {/* Valor + SLA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ValorPorMes contratos={contratos} isLoading={isLoading} />
          <SlaRiscoTable contratos={contratos} isLoading={isLoading} />
        </div>

        {/* Situações a Verificar */}
        <SituacoesVerificar contratos={contratos} isLoading={isLoading} />
      </div>
    </AppLayout>
  );
}