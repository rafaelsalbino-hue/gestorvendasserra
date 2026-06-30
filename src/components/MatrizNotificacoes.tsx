import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Funcao = Database["public"]["Enums"]["funcao_responsavel"];
type Etapa = Database["public"]["Enums"]["etapa_contrato"];
type Canal = "whatsapp" | "sistema";
type Entidade = "SESI Educação" | "SENAI" | "SESI Saúde";

const ENTIDADES: { value: Entidade; label: string }[] = [
  { value: "SENAI", label: "SENAI Ed. Profissional" },
  { value: "SESI Educação", label: "SESI Educação" },
  { value: "SESI Saúde", label: "SESI Saúde" },
];

const ETAPAS: { value: Etapa; label: string }[] = [
  { value: "visita" as Etapa, label: "Visita" },
  { value: "proposta" as Etapa, label: "Proposta" },
  { value: "supervisor" as Etapa, label: "Supervisor" },
  { value: "rpc" as Etapa, label: "RPC" },
  { value: "execucao" as Etapa, label: "Execução" },
  { value: "matricula" as Etapa, label: "Matrícula" },
  { value: "ensalamento" as Etapa, label: "Ensalamento" },
  { value: "faturamento" as Etapa, label: "Faturamento" },
  { value: "finalizado" as Etapa, label: "Finalizado" },
];

type Row = {
  id: string;
  etapa: Etapa;
  funcao: Funcao;
  canal: Canal;
  ativo: boolean;
  entidade: Entidade;
};

export function MatrizNotificacoes({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [entidade, setEntidade] = useState<Entidade>("SENAI");
  const qc = useQueryClient();

  // Cargos em uso: a partir dos responsáveis cadastrados (ativos ou não)
  const { data: funcoes } = useQuery({
    queryKey: ["matriz-notif-funcoes"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("funcao")
        .order("funcao");
      if (error) throw error;
      const set = new Set<Funcao>();
      for (const r of data ?? []) set.add(r.funcao as Funcao);
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["matriz-notif-rows"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacao_permissoes")
        .select("*");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const map = new Map<string, Row>();
  for (const r of rows ?? []) map.set(`${r.entidade}|${r.canal}|${r.etapa}|${r.funcao}`, r);

  const toggle = useMutation({
    mutationFn: async (v: { etapa: Etapa; funcao: Funcao; canal: Canal; entidade: Entidade; ativo: boolean; id?: string }) => {
      if (v.id) {
        const { error } = await supabase
          .from("notificacao_permissoes")
          .update({ ativo: v.ativo })
          .eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notificacao_permissoes")
          .insert({ etapa: v.etapa, funcao: v.funcao, canal: v.canal, ativo: v.ativo, entidade: v.entidade } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matriz-notif-rows"] });
    },
    onError: (err: any) => {
      toast.error("Falha ao salvar", { description: err?.message ?? String(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Notificações por cargo e etapa</DialogTitle>
          <DialogDescription>
            Configure por <strong>entidade</strong> os cargos que recebem notificação
            em cada etapa. Aplica-se apenas a responsáveis ativos e (no WhatsApp) com
            número cadastrado. O <strong>Agente de Mercado PJ</strong> notificado é
            sempre o "Agente PJ Responsável" do contrato.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground mr-1">Entidade:</span>
          {ENTIDADES.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEntidade(e.value)}
              className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                entidade === e.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        <Tabs value={canal} onValueChange={(v) => setCanal(v as Canal)}>
          <TabsList>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="sistema">Sistema (sino)</TabsTrigger>
          </TabsList>

          <TabsContent value={canal} className="mt-4">
            {isLoading || !funcoes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium min-w-[260px]">Cargo</th>
                      {ETAPAS.map((e) => (
                        <th key={e.value} className="p-2 font-medium text-center min-w-[90px]">
                          {e.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {funcoes.map((f) => (
                      <tr key={f} className="border-t hover:bg-muted/20">
                        <td className="p-2">{f}</td>
                        {ETAPAS.map((e) => {
                          const key = `${entidade}|${canal}|${e.value}|${f}`;
                          const row = map.get(key);
                          const ativo = !!row?.ativo;
                          return (
                            <td key={e.value} className="p-2 text-center">
                              <Checkbox
                                checked={ativo}
                                disabled={toggle.isPending}
                                onCheckedChange={(v) =>
                                  toggle.mutate({
                                    id: row?.id,
                                    etapa: e.value,
                                    funcao: f,
                                    canal,
                                    entidade,
                                    ativo: !!v,
                                  })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Dica</Badge>
              Mudanças entram em vigor imediatamente. A configuração é independente por entidade.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}