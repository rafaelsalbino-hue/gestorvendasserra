import { History } from "lucide-react";
import { useContratosHistorico } from "@/hooks/useContratosHistorico";
import { useContratoComentarios } from "@/hooks/useContratoComentarios";

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
  const { data: comentarios = [], isLoading: isLoadingComentarios } = useContratoComentarios(contratoId);
  const eventos = [
    ...(historico as any[]).map((h) => ({ ...h, tipo: "historico" as const })),
    ...(comentarios as any[]).map((c) => ({ ...c, tipo: "comentario" as const })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  if (isLoading || isLoadingComentarios) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  if (eventos.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <History className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico registrado</p>
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-muted pl-4 space-y-4 ml-1">
      {eventos.map((h) => (
        <li key={`${h.tipo}-${h.id}`} className="relative">
          <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
          <div className="text-xs text-muted-foreground">{fmt(h.created_at)}</div>
          {h.tipo === "comentario" ? (
            <>
              <div className="text-sm font-medium">Comentário</div>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
                {h.texto}
              </p>
              <div className="text-xs text-muted-foreground mt-1">
                por {h.autor_nome || "Usuário"}
                {h.autor_funcao ? ` · ${h.autor_funcao}` : ""}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </li>
      ))}
    </ol>
  );
}