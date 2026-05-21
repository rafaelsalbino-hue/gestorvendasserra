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
import { Loader2, Save, Lock, Trash2, History, ExternalLink, ArrowRight, CheckCircle2, MessageSquare, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { STATUS_OPTIONS, ETAPAS, FUNCOES_GESTOR, type EtapaContrato } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContrato, useSoftDeleteContrato } from "@/hooks/useContratos";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";
import { useContratoComentarios, useAddComentario } from "@/hooks/useContratoComentarios";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { SlaIndicator } from "@/components/SlaIndicator";
import { supabase } from "@/integrations/supabase/client";
import { ContratoAnexos } from "@/components/ContratoAnexos";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;
type FuncaoResponsavel = Tables<"responsaveis">["funcao"];

interface ContratoDetailDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = "__empty__";

const CRM_URL = "https://login.microsoftonline.com/2cf7d4d5-bd1b-4956-acf8-2995399b2168/oauth2/authorize?client_id=00000007-0000-0000-c000-000000000000&response_type=code%20id_token&scope=openid%20profile&state=OpenIdConnect.AuthenticationProperties%3DMAAAAIEpeTMuSxHxr8FgRb08lMT3Xi58qOpIvRZZ0vE0ka48uuHXR3QEhd9TAUTDwgvLjAEAAAABAAAACS5yZWRpcmVjdCNodHRwczovL2NybWZpZXNjLmNybTIuZHluYW1pY3MuY29tLw%26ReplyUrl%3DMAAAAIEpeTMuSxHxr8FgRb08lMRgdKbh7xVAYV6A3Vq26X7RVg8uv%252fEYG9Hhq40LK6r4EWh0dHBzOi8vY3BxLS1zYW1jcm1saXZlc2c2MDEuY3JtMi5keW5hbWljcy5jb20v%26RedirectTo%3DMAAAAIEpeTMuSxHxr8FgRb08lMRxY3CH9WBJtRsLZBpWxqcjfV906sB0lZP1JmBe%252fK9%252blWh0dHBzOi8vY3JtZmllc2MuY3JtMi5keW5hbWljcy5jb20v%26RedirectToForMcas%3Dhttps%253a%252f%252fcrmfiesc.crm2.dynamics.com%252f&response_mode=form_post&nonce=639118501407298283.OGFiNzc4MmUtOGYxNy00Zjk1LTg4ZDAtM2Y2ZjkxNGZhYjMwYjJhOTZmODctZTczNS00ZjAxLTk5YWQtOWRmMzQ5ZDBiNWEw&redirect_uri=https%3A%2F%2Fcpq--samcrmlivesg601.crm2.dynamics.com%2F&max_age=86400&claims=%7B%22id_token%22%3A%7B%22xms_cc%22%3A%7B%22values%22%3A%5B%22CP1%22%5D%7D%7D%7D&x-client-SKU=ID_NET472&x-client-ver=8.14.0.0";
const SGN_URL = "https://sgn.sesisenai.org.br/login.html";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Agente de Mercado PJ": ["dados_basicos", "proposta", "rpc", "execucao"],
  "Supervisor SESI": ["dados_basicos", "proposta"],
  "Supervisor SENAI": ["dados_basicos", "proposta"],
  "Backoffice Comercial": ["dados_basicos", "proposta", "rpc", "execucao", "matricula"],
  "Secretaria": ["matricula"],
  "PCP": ["ensalamento"],
  "Analista Financeiro": ["faturamento"],
  "Interlocutora de Faturamento": ["faturamento"],
};

function canEditSection(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
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

const ETAPA_ORDER: EtapaContrato[] = ["visita", "proposta", "rpc", "execucao", "matricula", "ensalamento", "faturamento"];

function getNextEtapa(current: EtapaContrato): EtapaContrato | null {
  const idx = ETAPA_ORDER.indexOf(current);
  return idx >= 0 && idx < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[idx + 1] : null;
}

export function ContratoDetailDialog({ contrato, open, onOpenChange }: ContratoDetailDialogProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateContrato();
  const deleteMutation = useSoftDeleteContrato();
  const { currentUser } = useCurrentUser();
  const { data: responsaveis = [] } = useResponsaveis();
  const [form, setForm] = useState<Partial<Contrato>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const { data: historico = [] } = useContratosHistorico(showHistory ? contrato?.id : undefined);
  const { data: comentarios = [] } = useContratoComentarios(showComments ? contrato?.id : undefined);

  // Sort: system comment(s) on top (chronological), then user comments chronological ascending
  const sortedComentarios = (() => {
    const list = [...comentarios];
    const sys = list
      .filter((c: any) => c.is_system)
      .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
    const manual = list
      .filter((c: any) => !c.is_system)
      .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
    return { sys, manual };
  })();

  const visibleManual =
    showAllComments || sortedComentarios.manual.length <= 5
      ? sortedComentarios.manual
      : sortedComentarios.manual.slice(-3);

  const getInitials = (name: string) =>
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  const addComentario = useAddComentario();
  const agentesPJ = responsaveis.filter((r) => r.funcao === "Agente de Mercado PJ");

  useEffect(() => {
    if (contrato) setForm({ ...contrato });
  }, [contrato]);

  if (!contrato) return null;

  const funcao = currentUser?.funcao;
  const canEdit = (section: string) => canEditSection(funcao, section);
  const isLastEtapa = form.etapa_atual === "faturamento";
  const nextEtapa = form.etapa_atual ? getNextEtapa(form.etapa_atual as EtapaContrato) : null;

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

  const doSave = async (extraUpdates?: Partial<Contrato>) => {
    if (!currentUser) {
      toast({ title: "Seu perfil não foi encontrado. Faça login novamente.", variant: "destructive" });
      return;
    }

    const finalForm = { ...form, ...extraUpdates };
    const etapaChanged = contrato.etapa_atual !== finalForm.etapa_atual;

    // CONCURRENT SAFETY: enviar apenas os campos que realmente mudaram
    // (evita sobrescrever alterações simultâneas de outros usuários)
    const SKIP_FIELDS = new Set(["id", "created_at", "updated_at", "etapa_updated_at"]);
    const diff: Partial<Contrato> = {};
    for (const key of Object.keys(finalForm) as (keyof Contrato)[]) {
      if (SKIP_FIELDS.has(key as string)) continue;
      const oldVal = (contrato as any)[key];
      const newVal = (finalForm as any)[key];
      // Comparação simples (valores são primitivos: string/number/null)
      if (oldVal !== newVal) {
        (diff as any)[key] = newVal;
      }
    }

    // Garante que mudanças explícitas (extraUpdates como etapa_atual) entrem mesmo se iguais
    if (extraUpdates) {
      for (const k of Object.keys(extraUpdates) as (keyof Contrato)[]) {
        (diff as any)[k] = (extraUpdates as any)[k];
      }
    }

    if (Object.keys(diff).length === 0) {
      toast({ title: "Nenhuma alteração para salvar" });
      onOpenChange(false);
      return;
    }

    updateMutation.mutate(
      { id: contrato.id, ...diff },
      {
        onSuccess: async () => {
          // Fecha imediatamente — não bloqueia a UI
          toast({ title: "Contrato atualizado!" });
          onOpenChange(false);

          // Histórico e e-mail rodam em background (fire-and-forget)
          logChanges(contrato.id, contrato, finalForm).catch(() => {});

          if (etapaChanged && finalForm.etapa_atual) {
            supabase.functions
              .invoke("notify-stage-change", {
                body: {
                  cliente: finalForm.cliente || contrato.cliente,
                  entidade: finalForm.entidade || contrato.entidade,
                  nova_etapa: finalForm.etapa_atual,
                  etapa_anterior: contrato.etapa_atual,
                },
              })
              .catch(() => {});
          }
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleSave = () => doSave();

  const handleSaveAndNext = () => {
    if (nextEtapa) {
      doSave({ etapa_atual: nextEtapa });
    }
  };

  const handleFinalize = () => {
    doSave({ execucao_faturamento: "Faturado" });
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
      <DialogContent className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
            <span className="break-words">{form.cliente}</span>
            <span className="text-xs font-normal text-muted-foreground">({form.entidade})</span>
            {(contrato as any).etapa_updated_at && (
              <SlaIndicator etapaUpdatedAt={(contrato as any).etapa_updated_at} />
            )}
          </DialogTitle>
          <DialogDescription>Gerencie os detalhes e etapas deste contrato</DialogDescription>
        </DialogHeader>

        {/* External links */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={CRM_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />CRM 365
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={SGN_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />SGN
            </a>
          </Button>
        </div>

        {!currentUser && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            ⚠️ Faça login novamente para poder editar os campos da sua responsabilidade.
          </div>
        )}

        <div className="space-y-6 py-2">
          {/* Dados básicos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Básicos</h3>
              <SectionLock locked={!canEdit("dados_basicos")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Agente PJ Responsável</Label>
                <Select value={(form as any).agente_pj_id || "__none__"} onValueChange={(v) => setForm(prev => ({ ...prev, agente_pj_id: v === "__none__" ? null : v }))} disabled={!canEdit("dados_basicos")}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Não definido —</SelectItem>
                    {agentesPJ.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusSelect label="Dados para Proposta" value={form.dados_proposta || ""} options={STATUS_OPTIONS.dados_proposta} onChange={(v) => set("dados_proposta", v)} disabled={!canEdit("proposta")} />
              <StatusSelect label="Status Proposta CRM" value={form.status_proposta_crm || ""} options={STATUS_OPTIONS.status_proposta_crm} onChange={(v) => set("status_proposta_crm", v)} disabled={!canEdit("proposta")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planilha Informações Gerais (link)</Label>
              <Input className="h-9 text-sm" value={form.planilha_info_gerais || ""} onChange={(e) => set("planilha_info_gerais", e.target.value)} placeholder="https://..." disabled={!canEdit("proposta")} />
            </div>
          </div>

          {/* Anexos da Proposta */}
          <ContratoAnexos contratoId={contrato.id} />

          {/* Etapa 2 - RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">2. RPC / Execução</h3>
              <SectionLock locked={!canEdit("rpc")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusSelect label="Abertura de Chamado" value={form.abertura_chamado || ""} options={STATUS_OPTIONS.abertura_chamado} onChange={(v) => set("abertura_chamado", v)} disabled={!canEdit("faturamento")} />
              <div className="space-y-1.5"><Label className="text-xs">Nº Chamado</Label><Input className="h-9 text-sm" value={form.numero_chamado || ""} onChange={(e) => set("numero_chamado", e.target.value)} disabled={!canEdit("faturamento")} /></div>
            </div>
            <StatusSelect label="Execução do Faturamento" value={form.execucao_faturamento || ""} options={STATUS_OPTIONS.execucao_faturamento} onChange={(v) => set("execucao_faturamento", v)} disabled={!canEdit("faturamento")} />
          </div>

          {/* Comentários */}
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {showComments ? "Ocultar Comentários" : "Comentários"}
              {comentarios.length > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{comentarios.length}</Badge>}
            </Button>
            {showComments && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Escreva um comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) {
                        addComentario.mutate({
                          contrato_id: contrato.id,
                          texto: commentText.trim(),
                          autor_nome: currentUser?.nome || "Desconhecido",
                          autor_funcao: currentUser?.funcao || "",
                        });
                        setCommentText("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!commentText.trim() || addComentario.isPending}
                    onClick={() => {
                      if (commentText.trim()) {
                        addComentario.mutate({
                          contrato_id: contrato.id,
                          texto: commentText.trim(),
                          autor_nome: currentUser?.nome || "Desconhecido",
                          autor_funcao: currentUser?.funcao || "",
                        });
                        setCommentText("");
                      }
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {comentarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
                  ) : (
                    <div className="divide-y">
                      {comentarios.map((c) => (
                        <div key={c.id} className="p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium">{c.autor_nome} <span className="text-muted-foreground font-normal">({c.autor_funcao})</span></span>
                            <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                          <p className="mt-0.5">{c.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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

        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-between gap-2 pt-2 sticky bottom-0 bg-background pb-1 -mx-1 px-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Arquivar contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  O contrato "{contrato.cliente}" será movido para o Arquivo. Você poderá restaurá-lo a qualquer momento.
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

          <div className="flex flex-col sm:flex-row gap-2 sm:flex-1 sm:justify-end">
            <Button variant="outline" onClick={handleSave} disabled={updateMutation.isPending || !currentUser} className="w-full sm:w-auto">
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
            {!isLastEtapa && nextEtapa && (
              <Button onClick={handleSaveAndNext} disabled={updateMutation.isPending || !currentUser} className="w-full sm:w-auto">
                <ArrowRight className="mr-2 h-4 w-4" />
                Salvar e Seguir
              </Button>
            )}
            {isLastEtapa && canEdit("faturamento") && (
              <Button onClick={handleFinalize} disabled={updateMutation.isPending || !currentUser} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
