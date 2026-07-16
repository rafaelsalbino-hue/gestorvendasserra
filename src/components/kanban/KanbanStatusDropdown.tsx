import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { STATUS_NEGOCIACAO, getStatus } from "./statusConfig";
import { useUpdateStatusNegociacao } from "@/hooks/useUpdateStatusNegociacao";
import { useAvancarEtapa } from "@/hooks/useAvancarEtapa";

interface Props {
  contratoId: string;
  etapaAtual: string;
  statusAtual: string | null | undefined;
}

export function KanbanStatusDropdown({ contratoId, etapaAtual, statusAtual }: Props) {
  const current = getStatus(statusAtual);
  const updateStatus = useUpdateStatusNegociacao();
  const avancar = useAvancarEtapa();
  const [pending, setPending] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    if (value === current.value) return;
    if (value === "ganha" || value === "perdido" || value === "cancelada") {
      setPending(value);
      return;
    }
    updateStatus.mutate({ id: contratoId, status: value });
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div onClick={stop} onPointerDown={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 text-xs h-7 px-2 rounded-md border border-border/60 bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${current.color}`} />
              <span className={`truncate font-medium ${current.text}`}>{current.label}</span>
            </span>
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Status da negociação
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_NEGOCIACAO.map((s, i) => (
            <div key={s.value}>
              {i === 1 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleSelect(s.value)}
                className="flex items-center gap-2 text-xs cursor-pointer"
              >
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="flex-1">{s.label}</span>
                {s.value === current.value && <Check className="h-3.5 w-3.5 text-green-600" />}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent onClick={stop} onPointerDown={stop}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === "ganha" && "Marcar como Ganha?"}
              {pending === "perdido" && "Marcar como Perdido?"}
              {pending === "cancelada" && "Cancelar este contrato?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "ganha" && "Você pode apenas atualizar o status ou também avançar para a próxima etapa."}
              {pending === "perdido" && "O contrato permanecerá na etapa atual e será marcado como Perdido."}
              {pending === "cancelada" && "O status será marcado como Cancelada. Esta ação pode ser revertida depois."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            {pending === "ganha" && (
              <AlertDialogAction
                onClick={() => {
                  updateStatus.mutate({ id: contratoId, status: "ganha" });
                  avancar.mutate({ id: contratoId, etapaAtual });
                  setPending(null);
                }}
              >
                Marcar e Avançar
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => {
                if (pending) updateStatus.mutate({ id: contratoId, status: pending });
                setPending(null);
              }}
            >
              {pending === "ganha" ? "Apenas marcar" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}