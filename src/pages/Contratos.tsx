import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ETAPAS, type Entidade } from "@/types/contracts";
import { NovoContratoDialog } from "@/components/NovoContratoDialog";

const Contratos = () => {
  const [entidade, setEntidade] = useState<Entidade>("SESI");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-muted-foreground">
              Gerencie os contratos firmados de educação
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        </div>

        {/* Entity selector */}
        <Tabs value={entidade} onValueChange={(v) => setEntidade(v as Entidade)}>
          <TabsList>
            <TabsTrigger value="SESI" className="gap-2">
              SESI Educação
            </TabsTrigger>
            <TabsTrigger value="SENAI" className="gap-2">
              SENAI Ed. Profissional
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Pipeline columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {ETAPAS.map((etapa) => (
                <div key={etapa.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={etapa.colorClass + " text-xs"}>
                      {etapa.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      0
                    </span>
                  </div>
                  <div className="min-h-[200px] rounded-lg border border-dashed border-border/50 bg-muted/30 p-2 space-y-2">
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum contrato nesta etapa
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Tabs>

        <NovoContratoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entidade={entidade}
        />
      </div>
    </AppLayout>
  );
};

export default Contratos;
