import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Mail, UserCircle, Loader2, Pencil, Download, Smartphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FUNCOES_RESPONSAVEL,
  ENTIDADES_ATUACAO,
  ESPECIALIDADES_POR_ENTIDADE,
  isSupervisorRole,
  isNotificavelRole,
  type FuncaoResponsavel,
  type EntidadeAtuacao,
} from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useResponsaveis, useAddResponsavel, useDeleteResponsavel } from "@/hooks/useResponsaveis";
import { useUpdateResponsavel } from "@/hooks/useUpdateResponsavel";
import { exportResponsaveisToXlsx } from "@/lib/export";
import type { Tables } from "@/integrations/supabase/types";

type Responsavel = Tables<"responsaveis">;

type FormErrors = { nome?: string; email?: string; funcao?: string; whatsapp?: string; entidade?: string; especialidade?: string };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function WhatsappField({
  value, onChange, id, required, error,
}: { value: string; onChange: (digits: string) => void; id?: string; required?: boolean; error?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="flex items-center gap-1">
          <Smartphone className="h-3.5 w-3.5 text-[#003DA5]" />
          WhatsApp para notificações{required ? " *" : ""}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">{required ? "(obrigatório)" : "(opcional)"}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Este número receberá mensagens automáticas quando um processo avançar para sua etapa de responsabilidade.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        id={id}
        inputMode="tel"
        placeholder="(27) 99999-0001"
        value={maskWhatsapp(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
        aria-invalid={!!error}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function validateResponsavel(
  nome: string,
  email: string,
  funcao: string,
  whatsapp: string,
  isSupervisorGeneric: boolean,
  entidade: string,
  especialidade: string,
): FormErrors {
  const errors: FormErrors = {};
  if (!nome.trim()) errors.nome = "Informe o nome.";
  else if (nome.trim().length < 2) errors.nome = "Nome muito curto.";
  if (!email.trim()) errors.email = "Informe o e-mail.";
  else if (!emailRegex.test(email.trim())) errors.email = "E-mail inválido.";
  if (!funcao) errors.funcao = "Selecione uma função.";
  if (isSupervisorGeneric) {
    if (!entidade) errors.entidade = "Selecione a entidade de atuação.";
    if (!especialidade) errors.especialidade = "Selecione a especialidade.";
  }
  const digits = (whatsapp || "").replace(/\D/g, "");
  const finalFuncao = isSupervisorGeneric && entidade && especialidade
    ? `Supervisor ${entidade} — ${especialidade}`
    : funcao;
  if (isNotificavelRole(finalFuncao)) {
    if (!digits) errors.whatsapp = "WhatsApp é obrigatório para esta função.";
    else if (digits.length < 10 || digits.length > 11) errors.whatsapp = "WhatsApp deve ter 10 ou 11 dígitos.";
  } else if (digits && (digits.length < 10 || digits.length > 11)) {
    errors.whatsapp = "WhatsApp deve ter 10 ou 11 dígitos.";
  }
  return errors;
}

const funcaoColors: Record<string, string> = {
  "Agente de Mercado PJ": "step-pj",
  "Supervisor SESI": "step-supervisor",
  "Supervisor SENAI": "step-supervisor",
  "Backoffice Comercial": "step-backoffice",
  "Secretaria": "step-secretaria",
  "PCP": "step-pcp",
  "Analista Financeiro": "step-financeiro",
  "Coordenador de Mercado": "step-pj",
  "Analista Comercial": "step-pj",
  "Gerente Regional": "step-pj",
  "Interlocutora de Faturamento": "step-financeiro",
};

const Responsaveis = () => {
  useDocumentTitle("Responsáveis");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResp, setEditingResp] = useState<Responsavel | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [funcao, setFuncao] = useState<FuncaoResponsavel | "">("");
  const [whatsapp, setWhatsapp] = useState("");
  const [entidade, setEntidade] = useState<EntidadeAtuacao | "">("");
  const [especialidade, setEspecialidade] = useState<string>("");
  const [filterFuncao, setFilterFuncao] = useState<string>("todas");

  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFuncao, setEditFuncao] = useState<FuncaoResponsavel | "">("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editEntidade, setEditEntidade] = useState<EntidadeAtuacao | "">("");
  const [editEspecialidade, setEditEspecialidade] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: responsaveis = [], isLoading } = useResponsaveis();
  const addMutation = useAddResponsavel();
  const deleteMutation = useDeleteResponsavel();
  const updateMutation = useUpdateResponsavel();

  // Mantém função composta quando entidade+especialidade estiverem preenchidos.
  useEffect(() => {
    if (entidade && especialidade) {
      setFuncao(`Supervisor ${entidade} — ${especialidade}` as FuncaoResponsavel);
    }
  }, [entidade, especialidade]);

  useEffect(() => {
    if (editEntidade && editEspecialidade) {
      setEditFuncao(`Supervisor ${editEntidade} — ${editEspecialidade}` as FuncaoResponsavel);
    }
  }, [editEntidade, editEspecialidade]);

  const isSupGeneric = isSupervisorRole(funcao) && (!!entidade || !!especialidade || !funcao);
  const isEditSupGeneric = isSupervisorRole(editFuncao) && (!!editEntidade || !!editEspecialidade || !editFuncao);

  const handleAdd = () => {
    const v = validateResponsavel(nome, email, funcao, whatsapp, isSupGeneric, entidade, especialidade);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    addMutation.mutate(
      { nome: nome.trim(), email: email.trim(), funcao: funcao as FuncaoResponsavel, whatsapp: whatsapp || null } as any,
      {
        onSuccess: () => {
          setNome(""); setEmail(""); setFuncao(""); setWhatsapp("");
          setEntidade(""); setEspecialidade(""); setErrors({});
          setDialogOpen(false);
          toast({ title: "Responsável cadastrado com sucesso!" });
        },
        onError: (e) => toast({ title: "Erro ao cadastrar", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleEdit = (resp: Responsavel) => {
    setEditingResp(resp);
    setEditNome(resp.nome);
    setEditEmail(resp.email);
    setEditFuncao(resp.funcao as FuncaoResponsavel);
    setEditWhatsapp(((resp as any).whatsapp as string) ?? "");
    // Pré-popula entidade/especialidade se a função for um Supervisor composto
    const f = String(resp.funcao || "");
    const m = f.match(/^Supervisor (SENAI|SESI Saúde|SESI Educação) — (.+)$/);
    if (m) {
      setEditEntidade(m[1] as EntidadeAtuacao);
      setEditEspecialidade(m[2]);
    } else {
      setEditEntidade("");
      setEditEspecialidade("");
    }
    setEditErrors({});
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingResp) return;
    const v = validateResponsavel(editNome, editEmail, editFuncao, editWhatsapp, isEditSupGeneric, editEntidade, editEspecialidade);
    setEditErrors(v);
    if (Object.keys(v).length > 0) return;
    updateMutation.mutate(
      { id: editingResp.id, nome: editNome.trim(), email: editEmail.trim(), funcao: editFuncao as FuncaoResponsavel, whatsapp: editWhatsapp || null } as any,
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingResp(null);
          toast({ title: "Responsável atualizado!" });
        },
        onError: (e) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleConfirmRemove = () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Responsável removido" }),
      onError: (e) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
    });
  };

  const filtered = filterFuncao === "todas"
    ? responsaveis
    : responsaveis.filter((r) => r.funcao === filterFuncao);

  const grouped = FUNCOES_RESPONSAVEL.reduce((acc, f) => {
    acc[f] = filtered.filter((r) => r.funcao === f);
    return acc;
  }, {} as Record<FuncaoResponsavel, typeof responsaveis>);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Responsáveis</h1>
            <p className="text-muted-foreground text-sm">Cadastre as pessoas responsáveis por cada etapa do fluxo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportResponsaveisToXlsx(filtered, "responsaveis.xlsx")}
              disabled={filtered.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />Exportar
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Responsável</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Responsável</DialogTitle>
                <DialogDescription>Preencha os dados do novo responsável</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, ...validateResponsavel(nome, email, funcao, whatsapp, isSupGeneric, entidade, especialidade) }))}
                  aria-invalid={!!errors.nome}
                    className={errors.nome ? "border-destructive" : ""}
                  />
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setErrors((p) => ({ ...p, ...validateResponsavel(nome, email, funcao, whatsapp, isSupGeneric, entidade, especialidade) }))}
                    aria-invalid={!!errors.email}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={funcao}
                    onValueChange={(v) => {
                      setFuncao(v as FuncaoResponsavel);
                      // Limpa entidade/especialidade quando o usuário escolhe diretamente um cargo
                      const m = v.match(/^Supervisor (SENAI|SESI Saúde|SESI Educação) — (.+)$/);
                      if (m) {
                        setEntidade(m[1] as EntidadeAtuacao);
                        setEspecialidade(m[2]);
                      } else {
                        setEntidade("");
                        setEspecialidade("");
                      }
                    }}
                  >
                    <SelectTrigger className={errors.funcao ? "border-destructive" : ""}><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      {FUNCOES_RESPONSAVEL.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.funcao && <p className="text-xs text-destructive">{errors.funcao}</p>}
                </div>
                {isSupervisorRole(funcao) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-[#003DA5]/30 bg-[#003DA5]/5 p-3">
                    <div className="space-y-2">
                      <Label>Entidade de atuação *</Label>
                      <Select value={entidade} onValueChange={(v) => { setEntidade(v as EntidadeAtuacao); setEspecialidade(""); }}>
                        <SelectTrigger className={errors.entidade ? "border-destructive" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {ENTIDADES_ATUACAO.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {errors.entidade && <p className="text-xs text-destructive">{errors.entidade}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Especialidade *</Label>
                      <Select value={especialidade} onValueChange={setEspecialidade} disabled={!entidade}>
                        <SelectTrigger className={errors.especialidade ? "border-destructive" : ""}><SelectValue placeholder={entidade ? "Selecione" : "Escolha a entidade"} /></SelectTrigger>
                        <SelectContent>
                          {entidade && ESPECIALIDADES_POR_ENTIDADE[entidade].map((esp) => (
                            <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.especialidade && <p className="text-xs text-destructive">{errors.especialidade}</p>}
                    </div>
                  </div>
                )}
                <WhatsappField id="wa-novo" value={whatsapp} onChange={setWhatsapp} required={isNotificavelRole(funcao)} error={errors.whatsapp} />
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full sm:w-auto">
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <Label className="text-sm">Filtrar por função:</Label>
          <Select value={filterFuncao} onValueChange={setFilterFuncao}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as funções</SelectItem>
              {FUNCOES_RESPONSAVEL.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FUNCOES_RESPONSAVEL.filter((f) => filterFuncao === "todas" || f === filterFuncao).map((funcaoKey) => (
              <Card key={funcaoKey}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{funcaoKey}</CardTitle>
                    <Badge className={(funcaoColors[funcaoKey] || "") + " text-xs"}>{grouped[funcaoKey]?.length || 0}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(!grouped[funcaoKey] || grouped[funcaoKey].length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum responsável cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {grouped[funcaoKey].map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.nome}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />{r.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(r)}
                              className="h-9 w-9"
                              aria-label={`Editar ${r.nome}`}
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmDeleteId(r.id)}
                              className="h-9 w-9"
                              aria-label={`Remover ${r.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Responsável</DialogTitle>
              <DialogDescription>Altere os dados do responsável</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onBlur={() => setEditErrors((p) => ({ ...p, ...validateResponsavel(editNome, editEmail, editFuncao, editWhatsapp, isEditSupGeneric, editEntidade, editEspecialidade) }))}
                  aria-invalid={!!editErrors.nome}
                  className={editErrors.nome ? "border-destructive" : ""}
                />
                {editErrors.nome && <p className="text-xs text-destructive">{editErrors.nome}</p>}
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onBlur={() => setEditErrors((p) => ({ ...p, ...validateResponsavel(editNome, editEmail, editFuncao, editWhatsapp, isEditSupGeneric, editEntidade, editEspecialidade) }))}
                  aria-invalid={!!editErrors.email}
                  className={editErrors.email ? "border-destructive" : ""}
                />
                {editErrors.email && <p className="text-xs text-destructive">{editErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select
                  value={editFuncao}
                  onValueChange={(v) => {
                    setEditFuncao(v as FuncaoResponsavel);
                    const m = v.match(/^Supervisor (SENAI|SESI Saúde|SESI Educação) — (.+)$/);
                    if (m) { setEditEntidade(m[1] as EntidadeAtuacao); setEditEspecialidade(m[2]); }
                    else { setEditEntidade(""); setEditEspecialidade(""); }
                  }}
                >
                  <SelectTrigger className={editErrors.funcao ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCOES_RESPONSAVEL.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
                {editErrors.funcao && <p className="text-xs text-destructive">{editErrors.funcao}</p>}
              </div>
              {isSupervisorRole(editFuncao) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-[#003DA5]/30 bg-[#003DA5]/5 p-3">
                  <div className="space-y-2">
                    <Label>Entidade de atuação *</Label>
                    <Select value={editEntidade} onValueChange={(v) => { setEditEntidade(v as EntidadeAtuacao); setEditEspecialidade(""); }}>
                      <SelectTrigger className={editErrors.entidade ? "border-destructive" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ENTIDADES_ATUACAO.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {editErrors.entidade && <p className="text-xs text-destructive">{editErrors.entidade}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade *</Label>
                    <Select value={editEspecialidade} onValueChange={setEditEspecialidade} disabled={!editEntidade}>
                      <SelectTrigger className={editErrors.especialidade ? "border-destructive" : ""}><SelectValue placeholder={editEntidade ? "Selecione" : "Escolha a entidade"} /></SelectTrigger>
                      <SelectContent>
                        {editEntidade && ESPECIALIDADES_POR_ENTIDADE[editEntidade].map((esp) => (
                          <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editErrors.especialidade && <p className="text-xs text-destructive">{editErrors.especialidade}</p>}
                  </div>
                </div>
              )}
              <WhatsappField id="wa-edit" value={editWhatsapp} onChange={setEditWhatsapp} required={isNotificavelRole(editFuncao)} error={editErrors.whatsapp} />
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="w-full sm:w-auto">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover responsável?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O responsável será removido permanentemente do cadastro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Responsaveis;
