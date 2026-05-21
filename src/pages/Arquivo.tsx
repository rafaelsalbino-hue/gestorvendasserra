import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Archive, Search, RotateCcw, XCircle, Trash2 } from "lucide-react";
import { useContratosArquivados, useRestaurarContrato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { ETAPAS } from "@/types/contracts";

export default function ArquivoPage() {
  useDocumentTitle("Arquivo");
  const { toast } = useToast();
  const { data: itens = [], isLoading } = useContratosArquivados();
  const restoreMutation = useRestaurarContrato();
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((c: any) => {
      const haystack = [
        c.cliente, c.cnpj, c.entidade, c.status_proposta_crm, c.status_rpc,
        c.etapa_atual, c.servico_produto, c.deleted_at,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [itens, busca]);

  const handleRestore = (id: string, cliente: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast({ title: `"${cliente}" restaurado ao pipeline` }),
      onError: (e) => toast({ title: "Erro ao restaurar", description: e.message, variant: "destructive" }),
    });
  };

  const etapaLabel = (id: string) => ETAPAS.find((e) => e.id === id)?.label || id;

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Archive className="h-5 w-5" /> Arquivo
          </h1>
          <p className="text-muted-foreground text-sm">Propostas canceladas ou excluídas. Restaure para devolver ao pipeline.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, CNPJ, status, etapa..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
            Nenhum item arquivado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map((c: any) => {
              const isDeleted = !!c.deleted_at;
              const isCancelled = c.status_proposta_crm === "Cancelada";
              const isLost = c.status_proposta_crm === "Perdido";
              return (
                <Card key={c.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.cliente}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.cnpj || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {isDeleted && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <Trash2 className="h-3 w-3" /> Excluída
                          </Badge>
                        )}
                        {isCancelled && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" /> Cancelada
                          </Badge>
                        )}
                        {isLost && (
                          <Badge className="gap-1 text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            <XCircle className="h-3 w-3" /> Perdido
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Entidade: <span className="text-foreground">{c.entidade}</span></p>
                      <p>Etapa anterior: <span className="text-foreground">{etapaLabel(c.etapa_atual)}</span></p>
                      {c.servico_produto && <p className="truncate">Serviço: {c.servico_produto}</p>}
                      {c.deleted_at && (
                        <p>Excluída em: {new Date(c.deleted_at).toLocaleString("pt-BR")}</p>
                      )}
                    </div>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleRestore(c.id, c.cliente)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Restaurar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}