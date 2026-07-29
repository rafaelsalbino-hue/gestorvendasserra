import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ETAPAS } from "@/types/contracts";
import { useAvancarEtapa, proximaEtapa } from "@/hooks/useAvancarEtapa";

interface Props {
  contratoId: string;
  etapaAtual: string;
}

export function KanbanAdvanceButton({ contratoId, etapaAtual }: Props) {
  const [open, setOpen] = useState(false);
  const avancar = useAvancarEtapa();
  const prox = proximaEtapa(etapaAtual);
  if (!prox) return null;
  const proxLabel = ETAPAS.find((e) => e.id === prox)?.label ?? prox;
  const atualLabel = ETAPAS.find((e) => e.id === etapaAtual)?.label ?? etapaAtual;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div onClick={stop} onPointerDown={stop}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        title={`Avançar para ${proxLabel}`}
        aria-label={`Avançar para ${proxLabel}`}
        onClick={() => setOpen(true)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={stop} onPointerDown={stop}>
          <AlertDialogHeader>
            <AlertDialogTitle>Avançar etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Avançar de <strong>{atualLabel}</strong> para <strong>{proxLabel}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                avancar.mutate({ id: contratoId, etapaAtual });
                setOpen(false);
              }}
            >
              Avançar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}