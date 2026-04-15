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
  const [entidade, setEntidade] = useState<Entidade>(entidadeInicial);
  const [cliente, setCliente] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [servico, setServico] = useState("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [crm, setCrm] = useState("");
  const [dadosProposta, setDadosProposta] = useState("");
  const [cnpjError, setCnpjError] = useState("");

  useEffect(() => { setEntidade(entidadeInicial); }, [entidadeInicial]);

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
    if (!cliente) {
      toast({ title: "Preencha o nome do cliente", variant: "destructive" });
      return;
    }
    if (cnpj && !validarCNPJ(cnpj)) {
      toast({ title: "CNPJ inválido", description: "Verifique os dígitos do CNPJ.", variant: "destructive" });
      return;
    }
    addMutation.mutate(
      {
        entidade,
        cliente,
        cnpj,
        servico_produto: servico,
        valor: parseCurrency(valorDisplay),
        crm,
        dados_proposta: dadosProposta,
      },
      {
        onSuccess: () => {
          toast({ title: `Contrato ${entidade} criado com sucesso!` });
          resetForm();
          onOpenChange(false);
        },
        onError: (e) => toast({ title: "Erro ao criar contrato", description: e.message, variant: "destructive" }),
      }
    );
  };

  const resetForm = () => {
    setEntidade(entidadeInicial);
    setCliente(""); setCnpj(""); setServico(""); setValorDisplay(""); setCrm(""); setDadosProposta(""); setCnpjError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => handleCnpjChange(e.target.value)} placeholder="00.000.000/0000-00" className={cnpjError ? "border-destructive" : ""} />
              {cnpjError && <p className="text-xs text-destructive">{cnpjError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <Label>Dados para a Proposta</Label>
            <Textarea value={dadosProposta} onChange={(e) => setDadosProposta(e.target.value)} placeholder="Informações adicionais..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
