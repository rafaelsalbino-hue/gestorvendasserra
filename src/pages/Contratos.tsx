import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ETAPAS, type Entidade } from "@/types/contracts";
import { NovoContratoDialog } from "@/components/NovoContratoDialog";
import { useContratos } from "@/hooks/useContratos";

const Contratos = () => {
  const [entidade, setEntidade] = useState<Entidade>("SESI");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: contratos = [], isLoading } = useContratos(entidade);

  const filtered = contratos.filter((c) =>
    !search || c.cliente.toLowerCase().includes(search.toLowerCase()) || c.cnpj.includes(search)
  );

  const byEtapa = (etapaId: string) => filtered.filter((c) => c.etapa_atual === etapaId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-muted-foreground">Gerencie os contratos firmados de educação</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Novo Contrato
          </Button>
        </div>

        <Tabs value={entidade} onValueChange={(v) => setEntidade(v as Entidade)}>
          <TabsList>
            <TabsTrigger value="SESI">SESI Educação</TabsTrigger>
            <TabsTrigger value="SENAI">SENAI Ed. Profissional</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por cliente, CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {ETAPAS.map((etapa) => {
                  const items = byEtapa(etapa.id);
                  return (
                    <div key={etapa.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={etapa.colorClass + " text-xs"}>{etapa.label}</Badge>
                        <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                      </div>
                      <div className="min-h-[200px] rounded-lg border border-dashed border-border/50 bg-muted/30 p-2 space-y-2">
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">Nenhum contrato nesta etapa</p>
                        ) : (
                          items.map((c) => (
                            <div key={c.id} className="rounded-md border bg-card p-3 space-y-1 shadow-sm">
                              <p className="text-sm font-medium truncate">{c.cliente}</p>
                              <p className="text-xs text-muted-foreground">{c.cnpj}</p>
                              {c.servico_produto && <p className="text-xs text-muted-foreground truncate">{c.servico_produto}</p>}
                              {c.valor > 0 && (
                                <p className="text-xs font-semibold text-primary">
                                  R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>

        <NovoContratoDialog open={dialogOpen} onOpenChange={setDialogOpen} entidadeInicial={entidade} />
      </div>
    </AppLayout>
  );
};

export default Contratos;
