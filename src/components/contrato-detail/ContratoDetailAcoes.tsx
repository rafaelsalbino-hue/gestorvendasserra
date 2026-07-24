import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Copy, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAvancarEtapa, proximaEtapa } from "@/hooks/useAvancarEtapa";
import { useSoftDeleteContrato, useAddContrato } from "@/hooks/useContratos";
import { useUserRole } from "@/hooks/useUserRole";
import { ETAPAS } from "@/types/contracts";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

export function ContratoDetailAcoes({
  contrato,
  onEdit,
  onClose,
}: {
  contrato: Contrato;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { isAdmin, isCoordenador } = useUserRole();
  const avancar = useAvancarEtapa();
  const softDelete = useSoftDeleteContrato();
  const addContrato = useAddContrato();
  const [confirmArquivar, setConfirmArquivar] = useState(false);

  const etapa = (contrato as any).etapa_atual as string;
  const prox = proximaEtapa(etapa);
  const proxLabel = prox ? ETAPAS.find((e) => e.id === prox)?.label ?? prox : null;
  const isFinal = etapa === "finalizado" || etapa === "faturamento";
  const canArquivar = isAdmin || isCoordenador;

  const handleDuplicate = async () => {
    const c = contrato as any;
    const clone = {
      cliente: c.cliente ? `${c.cliente} (cópia)` : "Novo contrato",
      cnpj: c.cnpj ?? null,
      entidade: c.entidade,
      subdivisao: c.subdivisao ?? null,
      unidade_atendimento: c.unidade_atendimento ?? null,
      valor: c.valor ?? null,
      valor_total_contrato: c.valor_total_contrato ?? null,
      tipo_contrato: c.tipo_contrato ?? null,
      agente_pj_id: c.agente_pj_id ?? null,
      etapa_atual: "visita",
      status_negociacao: "sem_status",
      observacoes_visita: c.observacoes_visita ?? null,
      observacoes_crm: c.observacoes_crm ?? null,
      observacoes_proposta: c.observacoes_proposta ?? null,
    };
    try {
      await addContrato.mutateAsync(clone as any);
      toast.success("Contrato duplicado com sucesso");
    } catch (e: any) {
      toast.error("Erro ao duplicar", { description: e?.message });
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
        Ações rápidas
      </h3>

      {!isFinal && prox && (
        <Button
          className="w-full justify-center"
          onClick={() => avancar.mutate({ id: contrato.id, etapaAtual: etapa })}
          disabled={avancar.isPending}
        >
          {avancar.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Avançar para {proxLabel}
        </Button>
      )}

      <Button variant="outline" className="w-full justify-center" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar contrato
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-center"
        onClick={handleDuplicate}
        disabled={addContrato.isPending}
      >
        {addContrato.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        Duplicar contrato
      </Button>

      {canArquivar && (
        <Button
          variant="ghost"
          className="w-full justify-center text-destructive hover:text-destructive"
          onClick={() => setConfirmArquivar(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Arquivar
        </Button>
      )}

      <AlertDialog open={confirmArquivar} onOpenChange={setConfirmArquivar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato será movido para o Arquivo e pode ser restaurado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                softDelete.mutate(
                  { id: contrato.id, motivo: "Arquivado via dialog" },
                  {
                    onSuccess: () => {
                      toast.success("Contrato arquivado");
                      setConfirmArquivar(false);
                      onClose();
                    },
                    onError: (e: any) =>
                      toast.error("Erro ao arquivar", { description: e?.message }),
                  },
                );
              }}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}