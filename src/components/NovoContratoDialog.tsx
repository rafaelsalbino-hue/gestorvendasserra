import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { type Entidade } from "@/types/contracts";
import { useToast } from "@/hooks/use-toast";

interface NovoContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidade: Entidade;
}

export function NovoContratoDialog({ open, onOpenChange, entidade }: NovoContratoDialogProps) {
  const { toast } = useToast();
  const [cliente, setCliente] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [servico, setServico] = useState("");
  const [valor, setValor] = useState("");
  const [crm, setCrm] = useState("");
  const [dadosProposta, setDadosProposta] = useState("");

  const handleSubmit = () => {
    if (!cliente || !cnpj) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    // TODO: save to Supabase
    toast({ title: `Contrato ${entidade} criado com sucesso!` });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCliente("");
    setCnpj("");
    setServico("");
    setValor("");
    setCrm("");
    setDadosProposta("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Novo Contrato — {entidade === "SESI" ? "SESI Educação" : "SENAI Ed. Profissional"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Serviço / Produto</Label>
              <Input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Descrição do serviço" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" type="text" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CRM</Label>
            <Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Número do CRM" />
          </div>
          <div className="space-y-2">
            <Label>Dados para a Proposta</Label>
            <Textarea
              value={dadosProposta}
              onChange={(e) => setDadosProposta(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Criar Contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
