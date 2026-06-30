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
import { STATUS_OPTIONS, ETAPAS, FUNCOES_GESTOR, FUNCOES_STATUS_AMPLO, type EtapaContrato } from "@/types/contracts";
import { formatBRL, formatBRLInput, parseBRL } from "@/lib/currency";
import { validarEtapaParaAvancar } from "@/hooks/useEtapaValidation";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContrato, useSoftDeleteContrato } from "@/hooks/useContratos";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canFinalizarContrato, canDeleteContratoAt } from "@/lib/permissions";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";
import { useContratoComentarios, useAddComentario } from "@/hooks/useContratoComentarios";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { SlaIndicator } from "@/components/SlaIndicator";
import { supabase } from "@/integrations/supabase/client";
import { ContratoAnexos } from "@/components/ContratoAnexos";
import { ContratoArquivos } from "@/components/ContratoArquivos";
import { DiasSemanaSelect } from "@/components/DiasSemanaSelect";
import { Switch } from "@/components/ui/switch";
import { FaturamentosParciais } from "@/components/FaturamentosParciais";
import { NotificacoesWhatsapp } from "@/components/NotificacoesWhatsapp";
import { NotifyEtapaBlock } from "@/components/NotifyEtapaBlock";
import { notifyEtapaWhatsapp } from "@/lib/whatsappNotify";
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
  "Analista Financeiro": ["faturamento"],
  "Interlocutora de Faturamento": ["faturamento"],
  // Backoffices segmentados por entidade — todos com edição ampla até matrícula
  "Backoffice SESI Saúde": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  "Backoffice SESI Educação": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  "Backoffice SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula"],
  // Coordenadores — acesso total
  "Coordenador SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador SESI Saúde": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador SESI Expansão": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  "Coordenador Comercial SENAI": ["dados_basicos", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"],
  // Secretaria e PCP segmentados
  "Secretaria Escolar": ["matricula"],
  "PCP SESI": ["ensalamento"],
  "PCP SENAI": ["ensalamento"],
};

// Supervisores específicos (todos prefixados) recebem permissão de Supervisor.
const SUPERVISOR_SECTIONS = ["dados_basicos", "proposta", "supervisor"];

function canEditSection(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
  if (FUNCOES_GESTOR.includes(funcao as any)) return true;
  if (typeof funcao === "string" && funcao.startsWith("Supervisor")) {
    return SUPERVISOR_SECTIONS.includes(section);
  }
  return ROLE_PERMISSIONS[funcao]?.includes(section) ?? false;
}

// Permissão ampliada para alterar qualquer campo de status (status_*) em qualquer etapa.
function canEditStatus(funcao: FuncaoResponsavel | undefined, section: string): boolean {
  if (!funcao) return false;
  if (FUNCOES_STATUS_AMPLO.includes(funcao as any)) return true;
  return canEditSection(funcao, section);
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

const ETAPA_ORDER: EtapaContrato[] = ["visita", "proposta", "supervisor", "rpc", "execucao", "matricula", "ensalamento", "faturamento"];

function getNextEtapa(current: EtapaContrato): EtapaContrato | null {
  const idx = ETAPA_ORDER.indexOf(current);
  return idx >= 0 && idx < ETAPA_ORDER.length - 1 ? ETAPA_ORDER[idx + 1] : null;
}

export function ContratoDetailDialog({ contrato, open, onOpenChange }: ContratoDetailDialogProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateContrato();
  const deleteMutation = useSoftDeleteContrato();
  const { currentUser } = useCurrentUser();
  const role = useUserRole();
  const { data: responsaveis = [] } = useResponsaveis();
  const [form, setForm] = useState<Partial<Contrato>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMotivo, setDeleteMotivo] = useState("");
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
  const canStatus = (section: string) => canEditStatus(funcao, section);
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

    // Auto-arquivar quando status_proposta_crm = "Perdido" ou "Cancelada"
    const statusAtual = (finalForm as any).status_proposta_crm;
    if (
      (statusAtual === "Perdido" || statusAtual === "Cancelada") &&
      !(contrato as any).deleted_at
    ) {
      const { data: { user } } = await supabase.auth.getUser();
      (finalForm as any).deleted_at = new Date().toISOString();
      (finalForm as any).deleted_by = user?.id ?? null;
    }

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

            // WhatsApp (Z-API) — fire-and-forget, nunca bloqueia o fluxo
            notifyEtapaWhatsapp({
              contratoId: contrato.id,
              novaEtapa: finalForm.etapa_atual as string,
              etapaAnterior: contrato.etapa_atual,
            });
          }
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleSave = () => doSave();

  const handleSaveAndNext = () => {
    if (!nextEtapa) return;
    const faltantes = validarEtapaParaAvancar(form, form.etapa_atual as EtapaContrato);
    if (faltantes.length > 0) {
      toast({
        title: "Não é possível avançar de etapa",
        description:
          "Preencha antes: " + faltantes.map((f) => f.label).join(", "),
        variant: "destructive",
      });
      return;
    }
    doSave({ etapa_atual: nextEtapa });
  };

  const handleFinalize = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    doSave({
      execucao_faturamento: "Faturado",
      etapa_atual: "finalizado" as any,
      finalized_at: new Date().toISOString() as any,
      finalized_by: (user?.id ?? null) as any,
      finalized_by_nome: (currentUser?.nome ?? "") as any,
    } as any);
    setTimeout(() => {
      toast({
        title: `Processo de ${form.cliente} finalizado`,
        description: "Movido para o Arquivo com sucesso.",
      });
    }, 400);
  };

  const handleDelete = () => {
    const motivo = deleteMotivo.trim();
    if (motivo.length < 3) {
      toast({ title: "Informe o motivo da exclusão", variant: "destructive" });
      return;
    }
    deleteMutation.mutate({ id: contrato.id, motivo }, {
      onSuccess: () => {
        toast({
          title: `Processo de ${form.cliente} arquivado`,
          description: "Disponível na seção Arquivo.",
        });
        setDeleteMotivo("");
        setDeleteOpen(false);
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

        {(contrato as any).acao_esperada && (
          <div className="rounded-md border-l-4 border-[#003DA5] bg-[#003DA5]/5 dark:bg-[#003DA5]/10 px-3 py-2 text-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#003DA5]">Ação esperada agora</div>
            <div className="mt-0.5 text-foreground">{(contrato as any).acao_esperada}</div>
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Valor total da proposta (R$)</Label>
                <div
                  className="rounded-md border p-3"
                  style={{
                    background: "hsl(var(--value-bg))",
                    borderColor: "hsl(var(--value-border))",
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-medium"
                      style={{ fontSize: 13, color: "hsl(var(--value-text))" }}
                    >
                      R$
                    </span>
                    <Input
                      className="h-9 text-sm border-transparent bg-transparent shadow-none px-1 flex-1 font-semibold"
                      style={{
                        fontSize: 22,
                        color: "hsl(var(--value-text))",
                      }}
                      inputMode="numeric"
                      value={form.valor != null ? formatBRL(Number(form.valor)) : ""}
                      onChange={(e) => set("valor", parseBRL(formatBRLInput(e.target.value)))}
                      disabled={!canEdit("dados_basicos")}
                      placeholder="0,00"
                      aria-label="Valor total da proposta"
                    />
                  </div>
                </div>
              </div>
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
              <StatusSelect label="Dados para Proposta" value={form.dados_proposta || ""} options={STATUS_OPTIONS.dados_proposta} onChange={(v) => set("dados_proposta", v)} disabled={!canStatus("proposta")} />
              <StatusSelect label="Status Proposta CRM" value={form.status_proposta_crm || ""} options={STATUS_OPTIONS.status_proposta_crm} onChange={(v) => set("status_proposta_crm", v)} disabled={!canStatus("proposta")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planilha Informações Gerais (link)</Label>
              <Input className="h-9 text-sm" value={form.planilha_info_gerais || ""} onChange={(e) => set("planilha_info_gerais", e.target.value)} placeholder="https://..." disabled={!canEdit("proposta")} />
            </div>
            <NotifyEtapaBlock contratoId={contrato.id} etapa="proposta" etapaLabel="Proposta / CRM" />
          </div>

          {/* Anexos da Proposta */}
          <ContratoAnexos contratoId={contrato.id} />

          {/* Etapa Supervisor */}
          <div className="space-y-3 rounded-md border-l-4 border-[#003DA5] bg-[#003DA5]/5 dark:bg-[#003DA5]/10 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#003DA5] uppercase tracking-wider">2. Supervisor</h3>
              <SectionLock locked={!canEdit("supervisor")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Carga Horária Total do Curso</Label>
                <Input className="h-9 text-sm" value={(form as any).sup_carga_horaria || ""} onChange={(e) => set("sup_carga_horaria" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº de Participantes</Label>
                <Input type="number" min={0} className="h-9 text-sm" value={(form as any).sup_num_participantes ?? ""} onChange={(e) => set("sup_num_participantes" as any, e.target.value === "" ? (null as any) : Number(e.target.value))} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Início</Label>
                <Input type="date" className="h-9 text-sm" value={(form as any).sup_data_inicio || ""} onChange={(e) => set("sup_data_inicio" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Término</Label>
                <Input type="date" className="h-9 text-sm" value={(form as any).sup_data_termino || ""} onChange={(e) => set("sup_data_termino" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Dias da Semana e Horários das Aulas</Label>
                <Textarea className="text-sm min-h-[60px]" value={(form as any).sup_dias_horarios || ""} onChange={(e) => set("sup_dias_horarios" as any, e.target.value)} disabled={!canEdit("supervisor")} placeholder="Ex.: Segunda e Quarta, 19h–22h" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Conteúdo Programático (Conforme produto cadastrado no SGN) e Carga horária de cada U.C.</Label>
                <Textarea className="text-sm min-h-[120px]" value={(form as any).sup_conteudo_programatico || ""} onChange={(e) => set("sup_conteudo_programatico" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 flex flex-col gap-2">
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#003DA5]"
                    checked={!!(form as any).sup_avaliacao_frequencia_nota}
                    onChange={(e) => setForm((p) => ({ ...p, sup_avaliacao_frequencia_nota: e.target.checked } as any))}
                    disabled={!canEdit("supervisor")}
                  />
                  <span>Processo de avaliação: min 75% freq. + Nota 7,0</span>
                </label>
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#003DA5]"
                    checked={!!(form as any).sup_avaliacao_frequencia}
                    onChange={(e) => setForm((p) => ({ ...p, sup_avaliacao_frequencia: e.target.checked } as any))}
                    disabled={!canEdit("supervisor")}
                  />
                  <span>Processo de avaliação: min 75% freq.</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CR/PJ</Label>
                <Input className="h-9 text-sm" value={(form as any).sup_cr_pj || ""} onChange={(e) => set("sup_cr_pj" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sugestão de Professor</Label>
                <Input className="h-9 text-sm" value={(form as any).sup_sugestao_professor || ""} onChange={(e) => set("sup_sugestao_professor" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Local Execução</Label>
                <Input className="h-9 text-sm" value={(form as any).sup_local_execucao || ""} onChange={(e) => set("sup_local_execucao" as any, e.target.value)} disabled={!canEdit("supervisor")} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-[#003DA5]/20">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#003DA5]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#003DA5]"
                  checked={!!(form as any).sup_finalizado}
                  onChange={async (e) => {
                    const finalizado = e.target.checked;
                    if (finalizado) {
                      const { data: { user } } = await supabase.auth.getUser();
                      setForm((p) => ({
                        ...p,
                        sup_finalizado: true,
                        sup_finalizado_at: new Date().toISOString(),
                        sup_finalizado_by: user?.id ?? null,
                        etapa_atual: "rpc",
                      } as any));
                      toast({ title: "Etapa Supervisor finalizada", description: "Avançando para RPC / Execução ao salvar." });
                    } else {
                      setForm((p) => ({ ...p, sup_finalizado: false, sup_finalizado_at: null, sup_finalizado_by: null } as any));
                    }
                  }}
                  disabled={!canEdit("supervisor")}
                />
                FINALIZADO (avança para RPC/Execução)
              </label>
            </div>
            <NotifyEtapaBlock contratoId={contrato.id} etapa="supervisor" etapaLabel="Supervisor" disabled={!canEdit("supervisor")} />
          </div>

          {/* Etapa 3 - RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">3. RPC / Execução</h3>
              <SectionLock locked={!canEdit("rpc")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nº RPC</Label><Input className="h-9 text-sm" value={form.numero_rpc || ""} onChange={(e) => set("numero_rpc", e.target.value)} disabled={!canEdit("rpc")} /></div>
              <StatusSelect label="Info Execução" value={form.info_execucao || ""} options={STATUS_OPTIONS.info_execucao} onChange={(v) => set("info_execucao", v)} disabled={!canStatus("rpc")} />
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Instrutor</Label>
                <Input
                  className="h-9 text-sm"
                  value={(form as any).instrutor || ""}
                  onChange={(e) => set("instrutor" as any, e.target.value)}
                  disabled={!canEdit("rpc")}
                  placeholder="Nome do instrutor"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Dias de Execução</Label>
                <DiasSemanaSelect
                  value={((form as any).dias_execucao as string[]) || []}
                  onChange={(v) => setForm((prev) => ({ ...prev, dias_execucao: v as any }))}
                  disabled={!canEdit("rpc")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário Início</Label>
                <Input
                  type="time"
                  className="h-9 text-sm"
                  value={(form as any).horario_inicio || ""}
                  onChange={(e) => set("horario_inicio" as any, e.target.value)}
                  disabled={!canEdit("rpc")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário Fim</Label>
                <Input
                  type="time"
                  className="h-9 text-sm"
                  value={(form as any).horario_fim || ""}
                  onChange={(e) => set("horario_fim" as any, e.target.value)}
                  disabled={!canEdit("rpc")}
                />
              </div>
            </div>
            <div className="rounded-md border border-dashed bg-muted/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium">Turma 2 ou mais? Baixe o modelo →</p>
                <a
                  href="/modelos/Modelo_Turmas_Adicionais_RPC.xlsx"
                  download
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Baixar modelo de turmas adicionais
                </a>
              </div>
              <ContratoArquivos
                contratoId={contrato.id}
                categoria="turmas_adicionais"
                label="Anexar planilha de turmas adicionais"
                accept=".xlsx,.xls,.csv"
                singleFile
                disabled={!canEdit("rpc")}
              />
            </div>
            <NotifyEtapaBlock contratoId={contrato.id} etapa="rpc" etapaLabel="RPC / Execução" disabled={!canEdit("rpc")} />
          </div>

          {/* Etapa 3 - Status RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">4. Status RPC</h3>
              <SectionLock locked={!canEdit("execucao")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusSelect label="Status RPC" value={form.status_rpc || ""} options={STATUS_OPTIONS.status_rpc} onChange={(v) => set("status_rpc", v)} disabled={!canStatus("execucao")} />
              <div className="space-y-1.5">
                <Label className="text-xs">Aguardando terceiro: Observação</Label>
                <Textarea className="text-sm min-h-[60px]" value={form.observacao_terceiro || ""} onChange={(e) => set("observacao_terceiro", e.target.value)} disabled={!canEdit("execucao")} />
              </div>
            </div>
            <NotifyEtapaBlock contratoId={contrato.id} etapa="execucao" etapaLabel="Status RPC / Execução" disabled={!canEdit("execucao")} />
          </div>

          {/* Etapa 4 - Matrícula */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">5. Matrícula / Dados</h3>
              <SectionLock locked={!canEdit("matricula")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusSelect label="Dados dos Estudantes" value={form.dados_estudantes || ""} options={STATUS_OPTIONS.dados_estudantes} onChange={(v) => set("dados_estudantes", v)} disabled={!canStatus("matricula")} />
              <StatusSelect label="Cadastro Estudantes / Matrícula" value={form.cadastro_estudantes || ""} options={STATUS_OPTIONS.cadastro_estudantes} onChange={(v) => set("cadastro_estudantes", v)} disabled={!canStatus("matricula")} />
            </div>
            <ContratoArquivos
              contratoId={contrato.id}
              categoria="planilha_alunos"
              label="Planilhas de Alunos da Turma"
              accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              allowMultiple
              disabled={!canEdit("matricula")}
            />
            <NotifyEtapaBlock contratoId={contrato.id} etapa="matricula" etapaLabel="Matrícula / Dados" disabled={!canEdit("matricula")} />
          </div>

          {/* Etapa 5 - Ensalamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">6. Ensalamento</h3>
              <SectionLock locked={!canEdit("ensalamento")} />
            </div>
            <StatusSelect label="Ensalamento PCP" value={form.ensalamento_pcp || ""} options={STATUS_OPTIONS.ensalamento_pcp} onChange={(v) => set("ensalamento_pcp", v)} disabled={!canStatus("ensalamento")} />
            <NotifyEtapaBlock contratoId={contrato.id} etapa="ensalamento" etapaLabel="PCP / Ensalamento" disabled={!canEdit("ensalamento")} />
          </div>

          {/* Etapa 6 - Faturamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">7. Faturamento</h3>
              <SectionLock locked={!canEdit("faturamento")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusSelect label="Abertura de Chamado" value={form.abertura_chamado || ""} options={STATUS_OPTIONS.abertura_chamado} onChange={(v) => set("abertura_chamado", v)} disabled={!canStatus("faturamento")} />
              <div className="space-y-1.5"><Label className="text-xs">Nº Chamado</Label><Input className="h-9 text-sm" value={form.numero_chamado || ""} onChange={(e) => set("numero_chamado", e.target.value)} disabled={!canEdit("faturamento")} /></div>
            </div>
            <StatusSelect label="Execução do Faturamento" value={form.execucao_faturamento || ""} options={STATUS_OPTIONS.execucao_faturamento} onChange={(v) => set("execucao_faturamento", v)} disabled={!canStatus("faturamento")} />
            <ContratoArquivos
              contratoId={contrato.id}
              categoria="chamado_faturamento"
              label="Chamado de Faturamento"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              singleFile
              disabled={!canEdit("faturamento")}
            />

            {/* Contrato Especial — Faturamento Parcial */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Contrato especial (faturamento parcial)</Label>
                  <p className="text-xs text-muted-foreground">Permite registrar várias parcelas de faturamento ao longo da execução.</p>
                </div>
                <Switch
                  checked={!!(form as any).contrato_especial}
                  onCheckedChange={(v) => setForm((prev) => ({ ...prev, contrato_especial: v } as any))}
                  disabled={!canEdit("faturamento")}
                />
              </div>

              {(form as any).contrato_especial && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor total do contrato (R$)</Label>
                    <Input
                      className="h-9 text-sm"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={(form as any).valor_total_contrato != null ? formatBRL(Number((form as any).valor_total_contrato)) : ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, valor_total_contrato: parseBRL(formatBRLInput(e.target.value)) } as any))}
                      disabled={!canEdit("faturamento")}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Se vazio, o saldo será calculado pelo valor da proposta (R$ {formatBRL(Number(form.valor || 0))}).
                    </p>
                  </div>

                  <FaturamentosParciais
                    contratoId={contrato.id}
                    valorTotal={Number((form as any).valor_total_contrato || form.valor || 0)}
                    disabled={!canEdit("faturamento")}
                  />
                </>
              )}
            </div>
            <NotifyEtapaBlock contratoId={contrato.id} etapa="faturamento" etapaLabel="Faturamento" disabled={!canEdit("faturamento")} />
            {(contrato as any).finalized_at && (
              <NotifyEtapaBlock contratoId={contrato.id} etapa="finalizado" etapaLabel="Finalizado" />
            )}
          </div>

          {/* Comentários */}
          <div className="space-y-3">
            {/* Histórico de notificações WhatsApp (visível para admin/gestor/coord/backoffice) */}
            <NotificacoesWhatsapp contratoId={contrato.id} />
            <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {showComments ? "Ocultar Comentários" : "Comentários"}
              {comentarios.length > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{comentarios.length}</Badge>}
            </Button>
            {showComments && (
              <div className="space-y-2">
                <div className="rounded-md border bg-background max-h-[420px] overflow-y-auto p-3 flex flex-col" style={{ gap: 10 }}>
                  {comentarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
                  ) : (
                    <>
                      {/* Sistema fixo no topo */}
                      {sortedComentarios.sys.map((c: any) => (
                        <div key={c.id} className="flex gap-2 items-start">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold" style={{ fontSize: 10 }}>
                            SY
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium" style={{ fontSize: 12 }}>Sistema</span>
                              <span className="rounded bg-primary/15 text-primary px-1.5 py-0.5 font-medium uppercase" style={{ fontSize: 9, letterSpacing: "0.05em" }}>auto</span>
                              <span className="text-muted-foreground" style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-muted/60 border-l-2 border-primary p-2 font-mono" style={{ fontSize: 11 }}>{c.texto}</pre>
                          </div>
                        </div>
                      ))}

                      {/* Toggle "ver histórico completo" */}
                      {sortedComentarios.manual.length > 5 && !showAllComments && (
                        <button
                          type="button"
                          onClick={() => setShowAllComments(true)}
                          className="self-center text-primary hover:underline"
                          style={{ fontSize: 11 }}
                        >
                          Ver histórico completo ({sortedComentarios.manual.length - 3} anteriores)
                        </button>
                      )}

                      {/* Comentários manuais */}
                      {visibleManual.map((c: any) => (
                        <div key={c.id} className="flex gap-2 items-start">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground font-semibold" style={{ fontSize: 10 }}>
                            {getInitials(c.autor_nome)}
                          </div>
                          <div className="flex-1 min-w-0 rounded-md border bg-card p-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium" style={{ fontSize: 12 }}>
                                {c.autor_nome}
                                {c.autor_funcao && <span className="text-muted-foreground font-normal"> · {c.autor_funcao}</span>}
                              </span>
                              <span className="text-muted-foreground" style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap break-words" style={{ fontSize: 12 }}>{c.texto}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {/* Campo de novo comentário ao final */}
                <div className="flex gap-2 pt-1">
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
          {canDeleteContratoAt(role, contrato as any) && (
          <AlertDialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeleteMotivo(""); }}>
            <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />Excluir
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Arquivar contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  O contrato "{contrato.cliente}" será movido para o Arquivo. Você poderá restaurá-lo a qualquer momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="delete-motivo" className="text-sm">
                  Motivo da exclusão <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="delete-motivo"
                  value={deleteMotivo}
                  onChange={(e) => setDeleteMotivo(e.target.value)}
                  placeholder="Ex.: cliente desistiu, proposta duplicada, valor incorreto..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground">Mínimo 3 caracteres. Registrado no histórico junto com seu nome.</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.preventDefault(); handleDelete(); }}
                  disabled={deleteMutation.isPending || deleteMotivo.trim().length < 3}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}

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
            {(isLastEtapa || canFinalizarContrato(role)) && canFinalizarContrato(role) && !(contrato as any).finalized_at && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="success" disabled={updateMutation.isPending || !currentUser} className="w-full sm:w-auto">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Finalizar Processo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalizar processo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{contrato.cliente}</strong> ({contrato.entidade}) — valor R$ {Number(contrato.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
                      <br />Etapa atual: {contrato.etapa_atual}. Após finalizado, somente Admin ou Coordenador poderão reabrir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalize} className="bg-success text-success-foreground hover:bg-success/90">
                      Confirmar finalização
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
