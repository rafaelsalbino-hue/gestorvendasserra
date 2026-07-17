import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Activity } from "lucide-react";
import { DiagnosticoWhatsappDialog } from "@/components/DiagnosticoWhatsappDialog";
import { DiagnosticoZapiDialog } from "@/components/DiagnosticoZapiDialog";

export function ContratoDetailDiagnosticoTab() {
  const [openWa, setOpenWa] = useState(false);
  const [openZ, setOpenZ] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ferramentas de diagnóstico do canal WhatsApp usadas para validar o
        envio de notificações e a saúde da integração Z-API.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setOpenWa(true)} className="justify-start h-auto py-3">
          <MessageSquare className="mr-2 h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Diagnóstico WhatsApp</div>
            <div className="text-[11px] text-muted-foreground">
              Simular envio e ver o log de entrega
            </div>
          </div>
        </Button>
        <Button variant="outline" onClick={() => setOpenZ(true)} className="justify-start h-auto py-3">
          <Activity className="mr-2 h-4 w-4" />
          <div className="text-left">
            <div className="text-sm font-medium">Status Z-API</div>
            <div className="text-[11px] text-muted-foreground">
              Verificar conexão da instância
            </div>
          </div>
        </Button>
      </div>
      <DiagnosticoWhatsappDialog open={openWa} onOpenChange={setOpenWa} />
      <DiagnosticoZapiDialog open={openZ} onOpenChange={setOpenZ} />
    </div>
  );
}