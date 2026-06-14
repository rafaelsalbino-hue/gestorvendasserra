import { useState } from "react";
import { ChevronDown, ChevronRight, Smartphone, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNotificacoesWhatsapp } from "@/hooks/useNotificacoesWhatsapp";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ETAPA_LABELS: Record<string, string> = {
  proposta: "Proposta / CRM",
  supervisor: "Supervisor",
  rpc: "RPC / Execução",
  execucao: "RPC / Execução",
  matricula: "Matrícula / Dados",
  ensalamento: "PCP",
  pcp: "PCP",
  faturamento: "Faturamento",
  finalizado: "Finalizado",
};

function maskNumber(num: string | null) {
  if (!num) return "—";
  const n = num.replace(/\D/g, "");
  if (n.length < 6) return num;
  return `${n.slice(0, 4)}•••${n.slice(-2)}`;
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "enviado") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><CheckCircle2 className="h-3 w-3" /> Enviado</Badge>;
  }
  if (status === "falhou") {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>;
  }
  if (status === "sem_numero") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><AlertTriangle className="h-3 w-3" /> Sem número</Badge>;
  }
  if (status === "api_nao_configurada") {
    return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> API não configurada</Badge>;
  }
  if (status === "duplicado") {
    return <Badge variant="outline">Duplicado (ignorado)</Badge>;
  }
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}

export function NotificacoesWhatsapp({ contratoId }: { contratoId: string }) {
  const { isAdmin, isCoordenador, loading: loadingRoles } = useUserRole();
  const canView = isAdmin || isCoordenador;
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotificacoesWhatsapp(contratoId, canView && open);

  if (loadingRoles || !canView) return null;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-[#003DA5]" />
          📱 Notificações enviadas
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              Nenhuma notificação enviada ainda para este processo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-2 font-medium">Destinatário</th>
                    <th className="py-2 pr-2 font-medium">Etapa</th>
                    <th className="py-2 pr-2 font-medium">Data/hora</th>
                    <th className="py-2 pr-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((n) => (
                    <tr key={n.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{n.destinatario_nome || "—"}</div>
                        <div className="text-xs text-muted-foreground">{maskNumber(n.numero_destinatario)}</div>
                      </td>
                      <td className="py-2 pr-2">{ETAPA_LABELS[n.etapa_destino ?? ""] ?? n.etapa_destino ?? "—"}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-2 pr-2"><StatusBadge status={n.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}