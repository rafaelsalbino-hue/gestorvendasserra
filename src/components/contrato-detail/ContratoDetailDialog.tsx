import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ContratoDetailHeader } from "./ContratoDetailHeader";
import { ContratoDetailResumo } from "./ContratoDetailResumo";
import { ContratoDetailHistorico } from "./ContratoDetailHistorico";
import { ContratoDetailDiagnosticoTab } from "./ContratoDetailDiagnosticoTab";
import { ContratoAnexos } from "@/components/ContratoAnexos";
import { FaturamentosParciais } from "@/components/FaturamentosParciais";
import { ContratoEditDialog } from "@/components/ContratoEditDialog";

type Contrato = Tables<"contratos">;

interface Props {
  contrato?: Contrato | null;
  contratoId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ContratoDetailDialog({ contrato: initial, contratoId, open, onOpenChange }: Props) {
  const id = initial?.id ?? contratoId ?? null;
  const { data: fetched, isLoading } = useQuery({
    queryKey: ["contrato-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Contrato | null;
    },
    enabled: !!id && open,
    initialData: initial ?? undefined,
    staleTime: 30_000,
  });

  const contrato = (fetched ?? initial) as Contrato | null;
  const [tab, setTab] = useState("resumo");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (open) setTab("resumo");
  }, [open, id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[900px] w-[95vw] max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-0 shrink-0 border-b">
            <DialogTitle className="sr-only">Detalhes do contrato</DialogTitle>
            <DialogDescription className="sr-only">
              Resumo, histórico, anexos, faturamentos e diagnóstico do contrato.
            </DialogDescription>
            {!contrato && isLoading ? (
              <div className="space-y-2 pb-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ) : contrato ? (
              <ContratoDetailHeader contrato={contrato} />
            ) : (
              <p className="py-6 text-sm text-muted-foreground">Contrato não encontrado.</p>
            )}
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {contrato ? (
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-1">
                  {[
                    { v: "resumo", l: "Resumo" },
                    { v: "historico", l: "Histórico" },
                    { v: "anexos", l: "Anexos" },
                    { v: "faturamentos", l: "Faturamentos" },
                    { v: "diagnostico", l: "Diagnóstico" },
                  ].map((t) => (
                    <TabsTrigger
                      key={t.v}
                      value={t.v}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none px-3 pb-2"
                    >
                      {t.l}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="resumo" className="mt-4 focus-visible:outline-none">
                  <ContratoDetailResumo
                    contrato={contrato}
                    onEdit={() => setEditOpen(true)}
                    onClose={() => onOpenChange(false)}
                  />
                </TabsContent>
                <TabsContent value="historico" className="mt-4 focus-visible:outline-none">
                  <ContratoDetailHistorico contratoId={contrato.id} />
                </TabsContent>
                <TabsContent value="anexos" className="mt-4 focus-visible:outline-none">
                  <ContratoAnexos contratoId={contrato.id} />
                </TabsContent>
                <TabsContent value="faturamentos" className="mt-4 focus-visible:outline-none">
                  <FaturamentosParciais
                    contratoId={contrato.id}
                    valorTotal={Number((contrato as any).valor_total_contrato ?? (contrato as any).valor ?? 0)}
                  />
                </TabsContent>
                <TabsContent value="diagnostico" className="mt-4 focus-visible:outline-none">
                  <ContratoDetailDiagnosticoTab />
                </TabsContent>
              </Tabs>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t px-6 py-3 shrink-0 bg-muted/30">
            <div className="text-[11px] text-muted-foreground">
              {contrato?.created_at && (
                <>
                  Criado em {new Date(contrato.created_at).toLocaleDateString("pt-BR")}
                  {(contrato as any).etapa_updated_at && (
                    <>
                      {" · "}Última movimentação:{" "}
                      {new Date((contrato as any).etapa_updated_at).toLocaleDateString("pt-BR")}
                    </>
                  )}
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edição avançada: reusa o dialog original (todos os campos por etapa) */}
      <ContratoEditDialog
        contrato={contrato}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}