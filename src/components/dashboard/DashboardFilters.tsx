import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSubdivisoes } from "@/hooks/useSubdivisoes";
import type { PeriodoDashboard } from "@/hooks/useDashboardData";

export interface DashFilters {
  periodo: PeriodoDashboard | "todos";
  entidade: string;
  subdivisao: string;
  etapa: string;
}

export const DEFAULT_FILTERS: DashFilters = {
  periodo: "30d",
  entidade: "todas",
  subdivisao: "todas",
  etapa: "todas",
};

const PERIODOS = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "60d", label: "Últimos 60 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
  { value: "todos", label: "Todos" },
];

const ENTIDADES = ["SENAI", "SESI Saúde", "SESI Educação", "SESI", "REDE"];

const ETAPAS = [
  { id: "visita", label: "Visita" },
  { id: "crm", label: "CRM" },
  { id: "supervisor", label: "Supervisor" },
  { id: "proposta", label: "Proposta" },
  { id: "rpc", label: "RPC" },
  { id: "execucao", label: "Execução" },
  { id: "matricula", label: "Matrícula" },
  { id: "ensalamento", label: "Ensalamento" },
  { id: "faturamento", label: "Faturamento" },
  { id: "finalizado", label: "Finalizado" },
];

interface Props {
  filters: DashFilters;
  onChange: (f: DashFilters) => void;
}

export function DashboardFilters({ filters, onChange }: Props) {
  const entidadeAtiva = filters.entidade !== "todas" ? filters.entidade : null;
  const { data: subs = [] } = useSubdivisoes(entidadeAtiva);
  const isDefault =
    filters.periodo === DEFAULT_FILTERS.periodo &&
    filters.entidade === "todas" &&
    filters.subdivisao === "todas" &&
    filters.etapa === "todas";

  const set = (patch: Partial<DashFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.entidade !== undefined) next.subdivisao = "todas";
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <Select value={filters.periodo} onValueChange={(v) => set({ periodo: v as any })}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIODOS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
        </SelectContent>
      </Select>

      <Select value={filters.entidade} onValueChange={(v) => set({ entidade: v })}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Entidade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as Entidades</SelectItem>
          {ENTIDADES.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
        </SelectContent>
      </Select>

      {entidadeAtiva && (
        <Select value={filters.subdivisao} onValueChange={(v) => set({ subdivisao: v })}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Subdivisão" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Subdivisões</SelectItem>
            {subs.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.etapa} onValueChange={(v) => set({ etapa: v })}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as Etapas</SelectItem>
          {ETAPAS.map((e) => (<SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>))}
        </SelectContent>
      </Select>

      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)} className="gap-1">
          <X className="w-4 h-4" /> Limpar
        </Button>
      )}
    </div>
  );
}