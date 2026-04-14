import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Lock, Trash2, History } from "lucide-react";
import { useState, useEffect } from "react";
import { STATUS_OPTIONS, ETAPAS, type EtapaContrato } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContrato, useDeleteContrato } from "@/hooks/useContratos";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type FuncaoResponsavel = Tables<"responsaveis">["funcao"];

interface ContratoDetailDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = "__empty__";

import { FUNCOES_GESTOR } from "@/types/contracts";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Agente de Mercado PJ": ["dados_basicos", "proposta"],
  "Supervisor SESI": ["dados_basicos", "proposta"],
  "Supervisor SENAI": ["dados_basicos", "proposta"],
  "Backoffice Comercial": ["rpc", "execucao"],
  "Secretaria": ["matricula"],
  "PCP": ["ensalamento"],
  "Analista Financeiro": ["faturamento"],
};

function canEditSection(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
  // Gestores (Coordenador de Mercado, Analista Comercial) podem editar tudo
  if (FUNCOES_GESTOR.includes(funcao as any)) return true;
  return ROLE_PERMISSIONS[funcao]?.includes(section) ?? false;
}

function SectionLock({ locked }: { locked: boolean }) {
  if (!locked) return null;
  return (
    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground font-normal">
      <Lock className="h-3 w-3" /> Somente leitura
    </Badge>
  );
}

function StatusSelect({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)} disabled={disabled}>
        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY}>— Não definido —</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  cliente: "Cliente", cnpj: "CNPJ", servico_produto: "Serviço/Produto", valor: "Valor",
  crm: "CRM", etapa_atual: "Etapa Atual", dados_proposta: "Dados Proposta",
  status_proposta_crm: "Status Proposta CRM", planilha_info_gerais: "Planilha Info",
  numero_rpc: "Nº RPC", info_execucao: "Info Execução", status_rpc: "Status RPC",
  observacao_terceiro: "Observação", dados_estudantes: "Dados Estudantes",
  cadastro_estudantes: "Cadastro Estudantes", ensalamento_pcp: "Ensalamento PCP",
  abertura_chamado: "Abertura Chamado", numero_chamado: "Nº Chamado",
  execucao_faturamento: "Execução Faturamento",
};

export function ContratoDetailDialog({ contrato, open, onOpenChange }: ContratoDetailDialogProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateContrato();
  const deleteMutation = useDeleteContrato();
  const { currentUser } = useCurrentUser();
  const [form, setForm] = useState<Partial<Contrato>>({});
  const [showHistory, setShowHistory] = useState(false);
  const { data: historico = [] } = useContratosHistorico(showHistory ? contrato?.id : undefined);

  useEffect(() => {
    if (contrato) setForm({ ...contrato });
  }, [contrato]);

  if (!contrato) return null;

  const funcao = currentUser?.funcao;
  const canEdit = (section: string) => canEditSection(funcao, section);

  const set = (field: keyof Contrato, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const logChanges = async (contratoId: string, original: Contrato, updated: Partial<Contrato>) => {
    const changes: { contrato_id: string; campo: string; valor_anterior: string; valor_novo: string; usuario_nome: string; usuario_funcao: string }[] = [];
    for (const key of Object.keys(updated) as (keyof Contrato)[]) {
      if (key === "id" || key === "created_at" || key === "updated_at") continue;
      const oldVal = String(original[key] ?? "");
      const newVal = String(updated[key] ?? "");
      if (oldVal !== newVal) {
        changes.push({
          contrato_id: contratoId,
          campo: FIELD_LABELS[key] || key,
          valor_anterior: oldVal,
          valor_novo: newVal,
          usuario_nome: currentUser?.nome || "Desconhecido",
          usuario_funcao: currentUser?.funcao || "",
        });
      }
    }
    if (changes.length > 0) {
      await supabase.from("contratos_historico").insert(changes);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast({ title: "Seu perfil não foi encontrado. Faça login novamente.", variant: "destructive" });
      return;
    }

    const etapaChanged = contrato.etapa_atual !== form.etapa_atual;

    updateMutation.mutate(
      { id: contrato.id, ...form },
      {
        onSuccess: async () => {
          await logChanges(contrato.id, contrato, form);
          toast({ title: "Contrato atualizado!" });

          if (etapaChanged && form.etapa_atual) {
            try {
              await supabase.functions.invoke("notify-stage-change", {
                body: {
                  cliente: form.cliente || contrato.cliente,
                  entidade: form.entidade || contrato.entidade,
                  nova_etapa: form.etapa_atual,
                  etapa_anterior: contrato.etapa_atual,
                },
              });
            } catch { /* silent */ }
          }
          onOpenChange(false);
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(contrato.id, {
      onSuccess: () => {
        toast({ title: "Contrato excluído!" });
        onOpenChange(false);
      },
      onError: (e) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {form.cliente}
            <span className="text-xs font-normal text-muted-foreground">({form.entidade})</span>
          </DialogTitle>
          <DialogDescription>Gerencie os detalhes e etapas deste contrato</DialogDescription>
        </DialogHeader>

        {!currentUser && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            ⚠️ Selecione seu perfil na barra lateral para poder editar os campos da sua responsabilidade.
          </div>
        )}

        <div className="space-y-6 py-2">
          {/* Dados básicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Básicos</h3>
              <SectionLock locked={!canEdit("dados_basicos")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Cliente</Label><Input className="h-9 text-sm" value={form.cliente || ""} onChange={(e) => set("cliente", e.target.value)} disabled={!canEdit("dados_basicos")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input className="h-9 text-sm" value={form.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} disabled={!canEdit("dados_basicos")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Serviço / Produto</Label><Input className="h-9 text-sm" value={form.servico_produto || ""} onChange={(e) => set("servico_produto", e.target.value)} disabled={!canEdit("dados_basicos")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Valor (R$)</Label><Input className="h-9 text-sm" value={form.valor || ""} onChange={(e) => set("valor", parseFloat(e.target.value.replace(",", ".")) || 0)} disabled={!canEdit("dados_basicos")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">CRM</Label><Input className="h-9 text-sm" value={form.crm || ""} onChange={(e) => set("crm", e.target.value)} disabled={!canEdit("dados_basicos")} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa Atual</Label>
                <Select value={form.etapa_atual || "proposta"} onValueChange={(v) => set("etapa_atual", v)} disabled={!canEdit("dados_basicos")}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ETAPAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Etapa 1 - Proposta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">1. Proposta / CRM</h3>
              <SectionLock locked={!canEdit("proposta")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Dados para Proposta" value={form.dados_proposta || ""} options={STATUS_OPTIONS.dados_proposta} onChange={(v) => set("dados_proposta", v)} disabled={!canEdit("proposta")} />
              <StatusSelect label="Status Proposta CRM" value={form.status_proposta_crm || ""} options={STATUS_OPTIONS.status_proposta_crm} onChange={(v) => set("status_proposta_crm", v)} disabled={!canEdit("proposta")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planilha Informações Gerais (link)</Label>
              <Input className="h-9 text-sm" value={form.planilha_info_gerais || ""} onChange={(e) => set("planilha_info_gerais", e.target.value)} placeholder="https://..." disabled={!canEdit("proposta")} />
            </div>
          </div>

          {/* Etapa 2 - RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">2. RPC / Execução</h3>
              <SectionLock locked={!canEdit("rpc")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nº RPC</Label><Input className="h-9 text-sm" value={form.numero_rpc || ""} onChange={(e) => set("numero_rpc", e.target.value)} disabled={!canEdit("rpc")} /></div>
              <StatusSelect label="Info Execução" value={form.info_execucao || ""} options={STATUS_OPTIONS.info_execucao} onChange={(v) => set("info_execucao", v)} disabled={!canEdit("rpc")} />
            </div>
          </div>

          {/* Etapa 3 - Status RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">3. Status RPC</h3>
              <SectionLock locked={!canEdit("execucao")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Status RPC" value={form.status_rpc || ""} options={STATUS_OPTIONS.status_rpc} onChange={(v) => set("status_rpc", v)} disabled={!canEdit("execucao")} />
              <div className="space-y-1.5">
                <Label className="text-xs">Aguardando terceiro: Observação</Label>
                <Textarea className="text-sm min-h-[60px]" value={form.observacao_terceiro || ""} onChange={(e) => set("observacao_terceiro", e.target.value)} disabled={!canEdit("execucao")} />
              </div>
            </div>
          </div>

          {/* Etapa 4 - Matrícula */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">4. Matrícula / Dados</h3>
              <SectionLock locked={!canEdit("matricula")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Dados dos Estudantes" value={form.dados_estudantes || ""} options={STATUS_OPTIONS.dados_estudantes} onChange={(v) => set("dados_estudantes", v)} disabled={!canEdit("matricula")} />
              <StatusSelect label="Cadastro Estudantes / Matrícula" value={form.cadastro_estudantes || ""} options={STATUS_OPTIONS.cadastro_estudantes} onChange={(v) => set("cadastro_estudantes", v)} disabled={!canEdit("matricula")} />
            </div>
          </div>

          {/* Etapa 5 - Ensalamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">5. Ensalamento</h3>
              <SectionLock locked={!canEdit("ensalamento")} />
            </div>
            <StatusSelect label="Ensalamento PCP" value={form.ensalamento_pcp || ""} options={STATUS_OPTIONS.ensalamento_pcp} onChange={(v) => set("ensalamento_pcp", v)} disabled={!canEdit("ensalamento")} />
          </div>

          {/* Etapa 6 - Faturamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">6. Faturamento</h3>
              <SectionLock locked={!canEdit("faturamento")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Abertura de Chamado" value={form.abertura_chamado || ""} options={STATUS_OPTIONS.abertura_chamado} onChange={(v) => set("abertura_chamado", v)} disabled={!canEdit("faturamento")} />
              <div className="space-y-1.5"><Label className="text-xs">Nº Chamado</Label><Input className="h-9 text-sm" value={form.numero_chamado || ""} onChange={(e) => set("numero_chamado", e.target.value)} disabled={!canEdit("faturamento")} /></div>
            </div>
            <StatusSelect label="Execução do Faturamento" value={form.execucao_faturamento || ""} options={STATUS_OPTIONS.execucao_faturamento} onChange={(v) => set("execucao_faturamento", v)} disabled={!canEdit("faturamento")} />
          </div>

          {/* Histórico */}
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              {showHistory ? "Ocultar Histórico" : "Ver Histórico de Alterações"}
            </Button>
            {showHistory && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {historico.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma alteração registrada</p>
                ) : (
                  <div className="divide-y">
                    {historico.map((h) => (
                      <div key={h.id} className="p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">{h.campo}</span>
                          <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          <span className="line-through">{h.valor_anterior || "—"}</span> → <span className="text-foreground">{h.valor_novo || "—"}</span>
                        </div>
                        <div className="text-muted-foreground">{h.usuario_nome} ({h.usuario_funcao})</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />Excluir Contrato
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. O contrato "{contrato.cliente}" será excluído permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={updateMutation.isPending || !currentUser}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
