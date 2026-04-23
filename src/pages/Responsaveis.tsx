import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { Plus, Trash2, Mail, UserCircle, Loader2, Pencil } from "lucide-react";
import { FUNCOES_RESPONSAVEL, type FuncaoResponsavel } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useResponsaveis, useAddResponsavel, useDeleteResponsavel } from "@/hooks/useResponsaveis";
import { useUpdateResponsavel } from "@/hooks/useUpdateResponsavel";
import type { Tables } from "@/integrations/supabase/types";

type Responsavel = Tables<"responsaveis">;

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
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingResp, setEditingResp] = useState<Responsavel | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [funcao, setFuncao] = useState<FuncaoResponsavel | "">("");
  const [filterFuncao, setFilterFuncao] = useState<string>("todas");

  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFuncao, setEditFuncao] = useState<FuncaoResponsavel | "">("");

  const { data: responsaveis = [], isLoading } = useResponsaveis();
  const addMutation = useAddResponsavel();
  const deleteMutation = useDeleteResponsavel();
  const updateMutation = useUpdateResponsavel();

  const handleAdd = () => {
    if (!nome || !email || !funcao) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    addMutation.mutate(
      { nome, email, funcao: funcao as FuncaoResponsavel },
      {
        onSuccess: () => {
          setNome(""); setEmail(""); setFuncao("");
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
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingResp || !editNome || !editEmail || !editFuncao) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    updateMutation.mutate(
      { id: editingResp.id, nome: editNome, email: editEmail, funcao: editFuncao as FuncaoResponsavel },
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

  const handleRemove = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Responsável removido" }),
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
                  <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={funcao} onValueChange={(v) => setFuncao(v as FuncaoResponsavel)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                    <SelectContent>
                      {FUNCOES_RESPONSAVEL.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
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
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
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
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(r.id)} className="h-8 w-8">
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
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={editFuncao} onValueChange={(v) => setEditFuncao(v as FuncaoResponsavel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCOES_RESPONSAVEL.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
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
      </div>
    </AppLayout>
  );
};

export default Responsaveis;
