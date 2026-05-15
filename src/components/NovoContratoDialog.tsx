import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { type Entidade } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";
import { useAddContrato } from "@/hooks/useContratos";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { validarCNPJ, formatarCNPJ } from "@/lib/cnpj";

interface NovoContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidadeInicial?: Entidade;
}

function formatCurrency(value: string): string {
  // Remove tudo exceto dígitos
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // Converte para centavos e formata
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(formatted: string): number {
  // Remove pontos de milhar e converte vírgula em ponto
  const clean = formatted.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

export function NovoContratoDialog({ open, onOpenChange, entidadeInicial = "SESI" }: NovoContratoDialogProps) {
  const { toast } = useToast();
  const addMutation = useAddContrato();
  const { data: responsaveis = [] } = useResponsaveis();
  const [entidade, setEntidade] = useState<Entidade>(entidadeInicial);
  const [cliente, setCliente] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [servico, setServico] = useState("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [crm, setCrm] = useState("");
  const [dadosProposta, setDadosProposta] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const [agentePjId, setAgentePjId] = useState<string>("");
  const [clienteError, setClienteError] = useState("");

  const agentesPJ = responsaveis.filter((r) => r.funcao === "Agente de Mercado PJ");

  useEffect(() => { setEntidade(entidadeInicial); }, [entidadeInicial]);

  // Reseta o formulário sempre que o diálogo é fechado (evita estado preso)
  useEffect(() => {
    if (!open) {
      setCliente(""); setCnpj(""); setServico("");
      setValorDisplay(""); setCrm(""); setDadosProposta("");
      setCnpjError(""); setAgentePjId(""); setClienteError("");
    }
  }, [open]);

  const handleCnpjChange = (value: string) => {
    const formatted = formatarCNPJ(value);
    setCnpj(formatted);
    if (formatted.replace(/[^\d]/g, "").length === 14) {
      setCnpjError(validarCNPJ(formatted) ? "" : "CNPJ inválido");
    } else {
      setCnpjError("");
    }
  };

  const handleValorChange = (value: string) => {
    const formatted = formatCurrency(value);
    setValorDisplay(formatted);
  };

  const handleSubmit = () => {
    let hasError = false;
    if (!cliente.trim()) {
      setClienteError("Informe o nome do cliente.");
      hasError = true;
    }
    if (cnpj && !validarCNPJ(cnpj)) {
      setCnpjError("CNPJ inválido");
      hasError = true;
    }
    if (hasError) {
      toast({ title: "Verifique os campos destacados", variant: "destructive" });
      return;
    }
    addMutation.mutate(
      {
        entidade,
        cliente: cliente.trim(),
        cnpj,
        servico_produto: servico,
        valor: parseCurrency(valorDisplay),
        crm,
        dados_proposta: dadosProposta,
        agente_pj_id: agentePjId || null,
      } as any,
      {
        onSuccess: () => {
          toast({ title: `Contrato ${entidade} criado com sucesso!` });
          resetForm();
          onOpenChange(false);
        },
        onError: (e: any) =>
          toast({
            title: "Erro ao criar contrato",
            description: e?.message || "Tente novamente em instantes.",
            variant: "destructive",
          }),
      }
    );
  };

  const resetForm = () => {
    setEntidade(entidadeInicial);
    setCliente(""); setCnpj(""); setServico(""); setValorDisplay(""); setCrm(""); setDadosProposta(""); setCnpjError(""); setAgentePjId("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Não permite fechar enquanto a criação está em andamento
        // (evita unmount cancelando a promise e estados inconsistentes)
        if (!o && addMutation.isPending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
          <DialogDescription>Preencha os dados para criar um novo contrato</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Entidade *</Label>
            <Select value={entidade} onValueChange={(v) => setEntidade(v as Entidade)}>
              <SelectTrigger><SelectValue placeholder="Selecione a entidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SESI">SESI Educação</SelectItem>
                <SelectItem value="SENAI">SENAI Ed. Profissional</SelectItem>
                <SelectItem value="SESI Saúde">SESI Saúde</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                value={cliente}
                onChange={(e) => { setCliente(e.target.value); if (clienteError) setClienteError(""); }}
                onBlur={() => { if (!cliente.trim()) setClienteError("Informe o nome do cliente."); }}
                placeholder="Nome do cliente"
                aria-invalid={!!clienteError}
                className={clienteError ? "border-destructive" : ""}
              />
              {clienteError && <p className="text-xs text-destructive">{clienteError}</p>}
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => handleCnpjChange(e.target.value)} placeholder="00.000.000/0000-00" className={cnpjError ? "border-destructive" : ""} />
              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serviço / Produto</Label>
              <Input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Descrição do serviço" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  value={valorDisplay}
                  onChange={(e) => handleValorChange(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>CRM</Label>
            <Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Número do CRM" />
          </div>
          <div className="space-y-2">
            <Label>Agente PJ Responsável</Label>
            <Select value={agentePjId || "__none__"} onValueChange={(v) => setAgentePjId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o agente..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Não definido —</SelectItem>
                {agentesPJ.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dados para a Proposta</Label>
            <Textarea value={dadosProposta} onChange={(e) => setDadosProposta(e.target.value)} placeholder="Informações adicionais..." rows={3} />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full sm:w-auto">
            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
