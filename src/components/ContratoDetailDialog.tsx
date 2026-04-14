import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { STATUS_OPTIONS, ETAPAS, type EtapaContrato } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContrato } from "@/hooks/useContratos";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

interface ContratoDetailDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = "__empty__";

function StatusSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY}>— Não definido —</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ContratoDetailDialog({ contrato, open, onOpenChange }: ContratoDetailDialogProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateContrato();
  const [form, setForm] = useState<Partial<Contrato>>({});

  useEffect(() => {
    if (contrato) setForm({ ...contrato });
  }, [contrato]);

  if (!contrato) return null;

  const set = (field: keyof Contrato, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    updateMutation.mutate(
      { id: contrato.id, ...form },
      {
        onSuccess: () => {
          toast({ title: "Contrato atualizado!" });
          onOpenChange(false);
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {form.cliente}
            <span className="text-xs font-normal text-muted-foreground">({form.entidade})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados básicos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Input className="h-9 text-sm" value={form.cliente || ""} onChange={(e) => set("cliente", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input className="h-9 text-sm" value={form.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Serviço / Produto</Label>
                <Input className="h-9 text-sm" value={form.servico_produto || ""} onChange={(e) => set("servico_produto", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor (R$)</Label>
                <Input className="h-9 text-sm" value={form.valor || ""} onChange={(e) => set("valor", parseFloat(e.target.value.replace(",", ".")) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CRM</Label>
                <Input className="h-9 text-sm" value={form.crm || ""} onChange={(e) => set("crm", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa Atual</Label>
                <Select value={form.etapa_atual || "proposta"} onValueChange={(v) => set("etapa_atual", v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Etapa 1 - Proposta */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">1. Proposta / CRM</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Dados para Proposta" value={form.dados_proposta || ""} options={STATUS_OPTIONS.dados_proposta} onChange={(v) => set("dados_proposta", v)} />
              <StatusSelect label="Status Proposta CRM" value={form.status_proposta_crm || ""} options={STATUS_OPTIONS.status_proposta_crm} onChange={(v) => set("status_proposta_crm", v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Planilha Informações Gerais (link)</Label>
              <Input className="h-9 text-sm" value={form.planilha_info_gerais || ""} onChange={(e) => set("planilha_info_gerais", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Etapa 2 - RPC */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">2. RPC / Execução</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº RPC</Label>
                <Input className="h-9 text-sm" value={form.numero_rpc || ""} onChange={(e) => set("numero_rpc", e.target.value)} />
              </div>
              <StatusSelect label="Info Execução" value={form.info_execucao || ""} options={STATUS_OPTIONS.info_execucao} onChange={(v) => set("info_execucao", v)} />
            </div>
          </div>

          {/* Etapa 3 - Status RPC */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">3. Status RPC</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Status RPC" value={form.status_rpc || ""} options={STATUS_OPTIONS.status_rpc} onChange={(v) => set("status_rpc", v)} />
              <div className="space-y-1.5">
                <Label className="text-xs">Aguardando terceiro: Observação</Label>
                <Textarea className="text-sm min-h-[60px]" value={form.observacao_terceiro || ""} onChange={(e) => set("observacao_terceiro", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Etapa 4 - Matrícula */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">4. Matrícula / Dados</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Dados dos Estudantes" value={form.dados_estudantes || ""} options={STATUS_OPTIONS.dados_estudantes} onChange={(v) => set("dados_estudantes", v)} />
              <StatusSelect label="Cadastro Estudantes / Matrícula" value={form.cadastro_estudantes || ""} options={STATUS_OPTIONS.cadastro_estudantes} onChange={(v) => set("cadastro_estudantes", v)} />
            </div>
          </div>

          {/* Etapa 5 - Ensalamento */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">5. Ensalamento</h3>
            <StatusSelect label="Ensalamento PCP" value={form.ensalamento_pcp || ""} options={STATUS_OPTIONS.ensalamento_pcp} onChange={(v) => set("ensalamento_pcp", v)} />
          </div>

          {/* Etapa 6 - Faturamento */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">6. Faturamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusSelect label="Abertura de Chamado" value={form.abertura_chamado || ""} options={STATUS_OPTIONS.abertura_chamado} onChange={(v) => set("abertura_chamado", v)} />
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Chamado</Label>
                <Input className="h-9 text-sm" value={form.numero_chamado || ""} onChange={(e) => set("numero_chamado", e.target.value)} />
              </div>
            </div>
            <StatusSelect label="Execução do Faturamento" value={form.execucao_faturamento || ""} options={STATUS_OPTIONS.execucao_faturamento} onChange={(v) => set("execucao_faturamento", v)} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
