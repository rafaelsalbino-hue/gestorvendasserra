import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ETAPAS } from "@/types/contracts";
import { notifyEtapaWhatsapp } from "@/lib/whatsappNotify";

const ORDEM = ETAPAS.map((e) => e.id);

export function proximaEtapa(atual: string): string | null {
  const i = ORDEM.indexOf(atual as any);
  if (i < 0 || i >= ORDEM.length - 1) return null;
  return ORDEM[i + 1];
}

export function useAvancarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, etapaAtual }: { id: string; etapaAtual: string }) => {
      const prox = proximaEtapa(etapaAtual);
      if (!prox) throw new Error("Já está na última etapa");
      const { error } = await supabase
        .from("contratos")
        .update({
          etapa_atual: prox as any,
          etapa_updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      notifyEtapaWhatsapp({ contratoId: id, novaEtapa: prox, etapaAnterior: etapaAtual });
      return prox;
    },
    onSuccess: (prox) => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      qc.invalidateQueries({ queryKey: ["contrato-detail"] });
      const label = ETAPAS.find((e) => e.id === prox)?.label ?? prox;
      toast.success(`Avançado para ${label}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao avançar etapa"),
  });
}