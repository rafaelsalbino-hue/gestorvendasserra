import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Loader2, Download, Filter, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ETAPAS, type Entidade, STATUS_OPTIONS } from "@/types/contracts";
import { SlaIndicator } from "@/components/SlaIndicator";
import { NovoContratoDialog } from "@/components/NovoContratoDialog";
import { ContratoDetailDialog } from "@/components/ContratoDetailDialog";
import { useContratos, useUpdateContrato } from "@/hooks/useContratos";
import { exportContratosToXlsx } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

type Contrato = Tables<"contratos">;

function DroppableColumn({ etapaId, children }: { etapaId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapaId });
  return (
    <div ref={setNodeRef} className={`min-h-[200px] rounded-lg border border-dashed p-2 space-y-2 transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border/50 bg-muted/30"}`}>
      {children}
    </div>
  );
}

function DraggableCard({ contrato, onClick }: { contrato: Contrato; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contrato.id,
    data: { etapa: contrato.etapa_atual },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-card p-3 space-y-1 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
      <div className="flex items-center gap-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <p className="text-sm font-medium truncate flex-1" onClick={onClick}>{contrato.cliente}</p>
      </div>
      <div onClick={onClick}>
        <p className="text-xs text-muted-foreground">{contrato.cnpj}</p>
        {contrato.servico_produto && <p className="text-xs text-muted-foreground truncate">{contrato.servico_produto}</p>}
        {contrato.valor > 0 && (
          <p className="text-xs font-semibold text-primary">
            R$ {contrato.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {(contrato as any).etapa_updated_at && (
          <SlaIndicator etapaUpdatedAt={(contrato as any).etapa_updated_at} compact />
        )}
      </div>
    </div>
  );
}

const Contratos = () => {
  useDocumentTitle("Contratos");
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entidade, setEntidade] = useState<Entidade>("SESI");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Contrato | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");

  const { data: contratos = [], isLoading } = useContratos(entidade);
  const updateMutation = useUpdateContrato();

  // Troca a aba para a entidade do contrato vindo da busca global (antes do fetch)
  useEffect(() => {
    const ent = searchParams.get("entidade") as Entidade | null;
    if (ent && ent !== entidade && ["SESI", "SENAI", "SESI Saúde"].includes(ent)) {
      setEntidade(ent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Abre o contrato quando vier ?highlight=ID
  useEffect(() => {
    const id = searchParams.get("highlight");
    if (id && contratos.length > 0) {
      const found = contratos.find((c) => c.id === id);
      if (found) {
        setSelected(found);
        searchParams.delete("highlight");
        searchParams.delete("entidade");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, contratos, setSearchParams]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filtered = contratos.filter((c) => {
    if (search && !c.cliente.toLowerCase().includes(search.toLowerCase()) && !c.cnpj.includes(search)) return false;
    if (filterStatus !== "todos" && c.status_rpc !== filterStatus && c.status_proposta_crm !== filterStatus) return false;
    if (filterValorMin && c.valor < parseFloat(filterValorMin)) return false;
    if (filterValorMax && c.valor > parseFloat(filterValorMax)) return false;
    return true;
  });

  const byEtapa = (etapaId: string) => filtered.filter((c) => c.etapa_atual === etapaId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const contratoId = active.id as string;
    const newEtapa = over.id as string;

    const contrato = contratos.find((c) => c.id === contratoId);
    if (!contrato || contrato.etapa_atual === newEtapa) return;

    const validEtapas = ETAPAS.map((e) => e.id);
    if (!validEtapas.includes(newEtapa as any)) return;

    updateMutation.mutate(
      { id: contratoId, etapa_atual: newEtapa as any },
      {
        onSuccess: () => toast({ title: `Contrato movido para ${ETAPAS.find((e) => e.id === newEtapa)?.label}` }),
        onError: (e) => toast({ title: "Erro ao mover", description: e.message, variant: "destructive" }),
      }
    );
  };

  const allStatuses = [
    ...STATUS_OPTIONS.status_proposta_crm,
    ...STATUS_OPTIONS.status_rpc,
  ];
  const uniqueStatuses = [...new Set(allStatuses)];

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-muted-foreground text-sm">Gerencie os contratos firmados de educação</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportContratosToXlsx(filtered, `contratos_${entidade}.xlsx`)}>
              <Download className="mr-2 h-4 w-4" />Exportar
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Novo Contrato
            </Button>
          </div>
        </div>

        <Tabs value={entidade} onValueChange={(v) => setEntidade(v as Entidade)}>
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="SESI" className="text-xs sm:text-sm">SESI Educação</TabsTrigger>
              <TabsTrigger value="SENAI" className="text-xs sm:text-sm">SENAI Ed. Profissional</TabsTrigger>
              <TabsTrigger value="SESI Saúde" className="text-xs sm:text-sm">SESI Saúde</TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative w-full sm:flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por cliente, CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />{showFilters ? "Ocultar Filtros" : "Filtros"}
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <label className="text-xs font-medium text-muted-foreground">Valor mín.</label>
                  <Input className="w-full sm:w-28 h-8 text-xs" type="number" placeholder="0" value={filterValorMin} onChange={(e) => setFilterValorMin(e.target.value)} />
                </div>
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <label className="text-xs font-medium text-muted-foreground">Valor máx.</label>
                  <Input className="w-full sm:w-28 h-8 text-xs" type="number" placeholder="999999" value={filterValorMax} onChange={(e) => setFilterValorMax(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("todos"); setFilterValorMin(""); setFilterValorMax(""); }}>
                    Limpar
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {ETAPAS.map((etapa) => {
                    const items = byEtapa(etapa.id);
                    return (
                      <div key={etapa.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={etapa.colorClass + " text-xs"}>{etapa.label}</Badge>
                          <span className="text-xs text-muted-foreground font-medium">{items.length}</span>
                        </div>
                        <DroppableColumn etapaId={etapa.id}>
                          {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Nenhum contrato nesta etapa</p>
                          ) : (
                            items.map((c) => (
                              <DraggableCard key={c.id} contrato={c} onClick={() => setSelected(c)} />
                            ))
                          )}
                        </DroppableColumn>
                      </div>
                    );
                  })}
                </div>
              </DndContext>
            )}
          </div>
        </Tabs>

        <NovoContratoDialog open={dialogOpen} onOpenChange={setDialogOpen} entidadeInicial={entidade} />
        <ContratoDetailDialog contrato={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      </div>
    </AppLayout>
  );
};

export default Contratos;
