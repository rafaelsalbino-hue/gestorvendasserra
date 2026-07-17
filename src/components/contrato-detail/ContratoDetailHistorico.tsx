import { History } from "lucide-react";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";

function fmt(d: string) {
  try {
    return new Date(d).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export function ContratoDetailHistorico({ contratoId }: { contratoId: string }) {
  const { data: historico = [], isLoading } = useContratosHistorico(contratoId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico registrado</p>
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-muted pl-4 space-y-4 ml-1">
      {(historico as any[]).map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
          <div className="text-xs text-muted-foreground">{fmt(h.created_at)}</div>
          <div className="text-sm font-medium">
            {h.campo}
            {h.valor_anterior || h.valor_novo ? (
              <span className="ml-1 font-normal text-muted-foreground">
                : {h.valor_anterior || "—"} → {h.valor_novo || "—"}
              </span>
            ) : null}
          </div>
          {h.usuario_nome && (
            <div className="text-xs text-muted-foreground mt-0.5">
              por {h.usuario_nome}
              {h.usuario_funcao ? ` · ${h.usuario_funcao}` : ""}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}