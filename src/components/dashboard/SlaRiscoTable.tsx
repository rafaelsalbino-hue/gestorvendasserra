import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { ContratoDash } from "@/hooks/useDashboardData";

interface Props {
  contratos: ContratoDash[];
  isLoading: boolean;
}

const ETAPA_LABEL: Record<string, string> = {
  visita: "Visita", crm: "CRM", supervisor: "Supervisor", proposta: "Proposta",
  rpc: "RPC", execucao: "Execução", matricula: "Matrícula",
  ensalamento: "Ensalamento", faturamento: "Faturamento",
};

export function SlaRiscoTable({ contratos, isLoading }: Props) {
  const navigate = useNavigate();
  const now = Date.now();

  const top = contratos
    .filter((c) => !c.deleted_at && !c.finalized_at && c.etapa_atual !== "finalizado" && c.etapa_updated_at)
    .map((c) => ({
      ...c,
      dias: Math.floor((now - new Date(c.etapa_updated_at!).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5);

  const statusOf = (dias: number) => {
    if (dias > 14) return { label: "Crítico", cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300" };
    if (dias >= 7) return { label: "Atenção", cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300" };
    return { label: "Normal", cls: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300" };
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          SLA — Contratos em Risco
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : top.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-8 h-8 opacity-40" />
            Nenhum contrato monitorado
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2 border-b">
              <div className="col-span-5">Cliente</div>
              <div className="col-span-3">Etapa</div>
              <div className="col-span-2 text-right">Dias</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {top.map((c) => {
              const s = statusOf(c.dias);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/contratos?highlight=${c.id}`)}
                  className="w-full grid grid-cols-12 items-center py-3 border-b last:border-b-0 text-sm hover:bg-muted/40 transition text-left"
                >
                  <div className="col-span-5 font-medium truncate pr-2">{c.cliente}</div>
                  <div className="col-span-3 text-muted-foreground truncate">{ETAPA_LABEL[c.etapa_atual] || c.etapa_atual}</div>
                  <div className="col-span-2 text-right font-semibold">{c.dias}d</div>
                  <div className="col-span-2 text-right">
                    <Badge variant="outline" className={`${s.cls} font-medium`}>{s.label}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}