import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, GripVertical, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ETAPAS, type Entidade, STATUS_OPTIONS, SUBDIVISIONS_BY_UNIT, SUBDIVISAO_COLORS } from "@/types/contracts";
import { SlaIndicator } from "@/components/SlaIndicator";
import { NovoContratoDialog } from "@/components/NovoContratoDialog";
import { ContratoDetailDialog } from "@/components/ContratoDetailDialog";
import { ImportarVisitasDialog } from "@/components/ImportarVisitasDialog";
import { useContratos, useUpdateContrato } from "@/hooks/useContratos";
import { exportContratosToXlsx } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { canCreateVisita, canImportar } from "@/lib/permissions";
import type { Tables } from "@/integrations/supabase/types";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Upload } from "lucide-react";

type Contrato = Tables<"contratos">;

function DroppableColumn({ etapaId, children }: { etapaId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapaId });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-dashed space-y-2 transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border/50 bg-muted/30"}`}
      style={{ padding: 10, minWidth: 160 }}
    >
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
    <div
      ref={setNodeRef}
      style={{ ...style, padding: "8px 10px" }}
      className="rounded-md border bg-card space-y-1 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <p className="truncate flex-1 font-medium" style={{ fontSize: 12 }} onClick={onClick}>{contrato.cliente}</p>
      </div>
      <div onClick={onClick} style={{ fontSize: 11 }}>
        <p className="text-muted-foreground">{contrato.cnpj}</p>
        <span
          className={`inline-block mt-1 rounded border px-1.5 py-0.5 font-medium ${
            contrato.status_proposta_crm
              ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200"
              : "bg-muted text-muted-foreground border-border italic"
          }`}
          style={{ fontSize: 10 }}
          title="Status Proposta CRM"
        >
          {contrato.status_proposta_crm || "Sem status CRM"}
        </span>
        {(contrato as any).subdivisao && (
          <span
            className={`inline-block mt-1 rounded border px-1.5 py-0.5 font-medium ${SUBDIVISAO_COLORS[(contrato as any).subdivisao] || "bg-muted text-muted-foreground border-border"}`}
            style={{ fontSize: 10 }}
          >
            {(contrato as any).subdivisao}
          </span>
        )}
        {contrato.servico_produto && <p className="text-muted-foreground truncate">{contrato.servico_produto}</p>}
        {contrato.valor > 0 && (
          <p className="font-semibold text-primary">
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
  const role = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entidade, setEntidade] = useState<Entidade>("SESI");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Contrato | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterValorMin, setFilterValorMin] = useState("");
  const [filterValorMax, setFilterValorMax] = useState("");
  const [filterSubdivisao, setFilterSubdivisao] = useState<string>("todas");
  const [filterStatusCrm, setFilterStatusCrm] = useState<string>("todos");

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
    if (filterStatus !== "todos" && c.status_rpc !== filterStatus) return false;
    if (filterStatusCrm !== "todos" && c.status_proposta_crm !== filterStatusCrm) return false;
    if (filterValorMin && c.valor < parseFloat(filterValorMin)) return false;
    if (filterValorMax && c.valor > parseFloat(filterValorMax)) return false;
    if (filterSubdivisao !== "todas" && (c as any).subdivisao !== filterSubdivisao) return false;
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

  const uniqueStatusRpc = [...new Set(STATUS_OPTIONS.status_rpc)];
  const uniqueStatusCrm = [...new Set(STATUS_OPTIONS.status_proposta_crm)];

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (search) activeFilters.push({ key: "search", label: `Busca: "${search}"`, clear: () => setSearch("") });
  if (filterStatus !== "todos") activeFilters.push({ key: "status", label: `Status RPC: ${filterStatus}`, clear: () => setFilterStatus("todos") });
  if (filterStatusCrm !== "todos") activeFilters.push({ key: "statuscrm", label: `Status CRM: ${filterStatusCrm}`, clear: () => setFilterStatusCrm("todos") });
  if (filterValorMin) activeFilters.push({ key: "min", label: `≥ R$ ${filterValorMin}`, clear: () => setFilterValorMin("") });
  if (filterValorMax) activeFilters.push({ key: "max", label: `≤ R$ ${filterValorMax}`, clear: () => setFilterValorMax("") });
  if (filterSubdivisao !== "todas") activeFilters.push({ key: "sub", label: `Área: ${filterSubdivisao}`, clear: () => setFilterSubdivisao("todas") });
  const clearAllFilters = () => {
    setSearch(""); setFilterStatus("todos"); setFilterStatusCrm("todos"); setFilterValorMin(""); setFilterValorMax(""); setFilterSubdivisao("todas");
  };

  const subdivisoesDisponiveis = SUBDIVISIONS_BY_UNIT[entidade] || [];

  // Reseta filtro de subdivisão ao trocar de entidade
  useEffect(() => {
    setFilterSubdivisao("todas");
  }, [entidade]);

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
            {canImportar(role) && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />Importar
              </Button>
            )}
            {canCreateVisita(role) && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Nova Visita
              </Button>
            )}
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
                  <label className="text-xs font-medium text-muted-foreground">Status RPC</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {uniqueStatusRpc.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Status Proposta CRM</label>
                  <Select value={filterStatusCrm} onValueChange={setFilterStatusCrm}>
                    <SelectTrigger className="w-full sm:w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {uniqueStatusCrm.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                {subdivisoesDisponiveis.length > 0 && (
                  <div className="space-y-1 flex-1 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground">Área</label>
                    <Select value={filterSubdivisao} onValueChange={setFilterSubdivisao}>
                      <SelectTrigger className="w-full sm:w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as áreas</SelectItem>
                        {subdivisoesDisponiveis.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterStatus("todos"); setFilterStatusCrm("todos"); setFilterValorMin(""); setFilterValorMax(""); setFilterSubdivisao("todas"); }}>
                    Limpar
                  </Button>
                </div>
              </div>
            )}

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {activeFilters.map((f) => (
                  <Badge key={f.key} variant="secondary" className="gap-1 pr-1">
                    {f.label}
                    <button
                      onClick={f.clear}
                      aria-label={`Remover filtro ${f.label}`}
                      className="rounded hover:bg-background/60 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAllFilters}>
                  Limpar tudo
                </Button>
              </div>
            )}

            {isLoading ? (
              <div
                className="overflow-x-auto md:overflow-visible -mx-3 px-3 sm:mx-0 sm:px-0"
              >
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(160px, 1fr))` }}
              >
                {ETAPAS.map((e) => (
                  <div key={e.id} className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ))}
              </div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto md:overflow-visible -mx-3 px-3 sm:mx-0 sm:px-0">
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(160px, 1fr))` }}
                >
                  {ETAPAS.map((etapa) => {
                    const items = byEtapa(etapa.id);
                    return (
                      <div key={etapa.id} className="space-y-2 min-w-[160px]">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={etapa.colorClass + " rounded px-1.5 py-0.5 font-semibold uppercase truncate"}
                            style={{ fontSize: 11, letterSpacing: "0.04em" }}
                          >
                            {etapa.label}
                          </span>
                          <span
                            className="rounded-full bg-muted text-muted-foreground font-medium px-2 py-0.5"
                            style={{ fontSize: 10 }}
                          >
                            {items.length}
                          </span>
                        </div>
                        <DroppableColumn etapaId={etapa.id}>
                          {items.length === 0 ? (
                            <p className="text-muted-foreground text-center py-6" style={{ fontSize: 11 }}>Sem itens</p>
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
                </div>
              </DndContext>
            )}
          </div>
        </Tabs>

        <NovoContratoDialog open={dialogOpen} onOpenChange={setDialogOpen} entidadeInicial={entidade} />
        <ImportarVisitasDialog open={importOpen} onOpenChange={setImportOpen} />
        <ContratoDetailDialog contrato={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      </div>
    </AppLayout>
  );
};

export default Contratos;
