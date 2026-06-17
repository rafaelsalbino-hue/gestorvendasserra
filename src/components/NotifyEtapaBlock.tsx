import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Send, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notifyEtapaWhatsapp } from "@/lib/whatsappNotify";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  contratoId: string;
  etapa: string;
  etapaLabel: string;
  disabled?: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export function NotifyEtapaBlock({ contratoId, etapa, etapaLabel, disabled }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: ultimas } = useQuery({
    queryKey: ["notif-etapa", contratoId, etapa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes_whatsapp" as any)
        .select("*")
        .eq("contrato_id", contratoId)
        .eq("etapa_destino", etapa)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 1000 * 15,
  });

  const statusInfo = useMemo(() => {
    if (!ultimas || ultimas.length === 0) {
      return { icon: null, text: "Nenhuma notificação enviada nesta etapa", tone: "muted" as const };
    }
    const ultima = ultimas[0];
    const created = ultima.created_at as string;
    // Agrupa o lote pelo mesmo created_at (segundos) para contar destinatários
    const grupo = ultimas.filter(
      (n) => Math.abs(new Date(n.created_at).getTime() - new Date(created).getTime()) < 5000,
    );
    const enviados = grupo.filter((n) => n.status === "enviado").length;
    const falhou = grupo.every((n) => n.status === "falhou" || n.status === "api_nao_configurada" || n.status === "sem_numero");
    if (falhou) {
      return {
        icon: <XCircle className="h-3.5 w-3.5 text-destructive" />,
        text: `Falha no último envio (${timeAgo(created)}) — tentar novamente`,
        tone: "error" as const,
      };
    }
    if (enviados === 0) {
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />,
        text: `Tentativa registrada ${timeAgo(created)} — sem entregas confirmadas`,
        tone: "warn" as const,
      };
    }
    return {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      text: `Notificação enviada ${timeAgo(created)} para ${enviados} destinatário${enviados > 1 ? "s" : ""}`,
      tone: "ok" as const,
    };
  }, [ultimas]);

  const enviar = async () => {
    setSending(true);
    try {
      const res: any = await notifyEtapaWhatsapp({
        contratoId,
        novaEtapa: etapa,
        origem: "manual",
      });
      if (res?.error) throw res.error;
      toast({
        title: "Notificação enviada",
        description: `Responsáveis da etapa "${etapaLabel}" foram notificados via WhatsApp.`,
      });
      qc.invalidateQueries({ queryKey: ["notif-etapa", contratoId, etapa] });
      qc.invalidateQueries({ queryKey: ["notificacoes-whatsapp", contratoId] });
    } catch (e: any) {
      toast({
        title: "Falha ao enviar notificação",
        description: e?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-xs min-w-0">
        {statusInfo.icon}
        <span className="text-muted-foreground truncate">{statusInfo.text}</span>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Notificar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar notificação desta etapa?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Será enviada uma mensagem via WhatsApp para os responsáveis da etapa{" "}
                  <strong className="text-foreground">{etapaLabel}</strong>, sem avançar o processo.
                </p>
                <p className="text-xs">
                  Os destinatários são definidos automaticamente conforme a etapa e a entidade
                  (SESI / SESI Saúde / SENAI).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); enviar(); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={sending}
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}