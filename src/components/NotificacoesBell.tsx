import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificacoes, useMarcarNotificacaoLida, useMarcarTodasLidas } from "@/hooks/useNotificacoes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificacoesBell() {
  const navigate = useNavigate();
  const { data: notificacoes = [] } = useNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasLidas();

  const naoLidas = notificacoes.filter((n) => !n.lida_at);
  const count = naoLidas.length;

  const handleClick = (n: typeof notificacoes[number]) => {
    if (!n.lida_at) marcarLida.mutate(n.id);
    if (n.contrato_id) {
      navigate(`/contratos?highlight=${n.contrato_id}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] rounded-full flex items-center justify-center"
            >
              {count > 9 ? "9+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notificações</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => marcarTodas.mutate()}
            >
              <CheckCheck className="h-3 w-3" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notificacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 px-3">
              Sem notificações
            </p>
          ) : (
            <ul className="divide-y">
              {notificacoes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors ${
                      !n.lida_at ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lida_at && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}