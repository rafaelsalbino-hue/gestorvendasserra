import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Filter, GripVertical, X, Inbox } from "lucide-react";
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
import { canCreateVisita, canImportar, canMoverStatus } from "@/lib/permissions";
import { ENTIDADE_CLASS, entidadeShort } from "@/lib/entidade";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { getUltimaMovimentacaoAt, isEmAtencao, isPropostaVencida, getDiasNaProposta, getPropostaSlaLimit, isSupervisorVencida, getDiasNoSupervisor, getSupervisorSlaLimit } from "@/lib/sla";
import { notifyEtapaWhatsapp } from "@/lib/whatsappNotify";
import { useSaldoEspeciais } from "@/hooks/useSaldoEspeciais";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Upload } from "lucide-react";

type Contrato = Tables<"contratos">;

const ETAPA_ORDER = ETAPAS.map((e) => e.id);

function statusCrmColor(status: string | null | undefined): string {
  if (!status) return "bg-muted text-muted-foreground border-border";
  const s = status.toLowerCase();
  if (s.includes("ganha") || s.includes("aprov") || s.includes("assin")) return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (s.includes("negocia")) return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200";
  if (s.includes("elabora") || s.includes("envia")) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200";
  if (s.includes("perdido") || s.includes("cancel")) return "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
  return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200";
}

function DroppableColumn({ etapaId, children }: { etapaId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapaId });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border space-y-2 transition-all ${
        isOver
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border/40 bg-muted/30"
      }`}
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

  const etapaIdx = ETAPA_ORDER.indexOf(contrato.etapa_atual as any);
  const updateMutation = useUpdateContrato();
  const ultimaMov = getUltimaMovimentacaoAt(contrato as any);
  const propostaVencida = isPropostaVencida(contrato as any);
  const { data: saldoEspeciais } = useSaldoEspeciais();
  const isEspecial = !!(contrato as any).contrato_especial;
  const saldoInfo = isEspecial ? saldoEspeciais?.byContrato.get(contrato.id) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      className={`relative rounded-lg border bg-card space-y-1 shadow-sm cursor-pointer hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden ${propostaVencida ? "border-destructive ring-1 ring-destructive/40 animate-pulse" : ""}`}
    >
      <div style={{ padding: "8px 10px" }} className="space-y-1.5">
        <div className="flex items-center gap-1">
          <button
            {...attributes} {...listeners}
            aria-label="Arrastar contrato"
            className="cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <p className="truncate flex-1 font-medium" style={{ fontSize: 12 }} onClick={onClick}>{contrato.cliente}</p>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${ENTIDADE_CLASS[contrato.entidade as Entidade] || ""}`}
            style={{ fontSize: 9, letterSpacing: "0.02em" }}
            title={contrato.entidade}
          >
            {entidadeShort(contrato.entidade)}
          </span>
        </div>

        <div onClick={onClick} className="space-y-1" style={{ fontSize: 11 }}>
          {contrato.cnpj && <p className="text-muted-foreground">{contrato.cnpj}</p>}

          {/* Status CRM editável inline */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={contrato.status_proposta_crm || "__empty__"}
              onValueChange={(v) =>
                updateMutation.mutate({ id: contrato.id, status_proposta_crm: v === "__empty__" ? "" : v })
              }
            >
              <SelectTrigger
                className={`h-auto py-0.5 px-1.5 border font-medium w-auto inline-flex gap-1 [&>svg]:h-3 [&>svg]:w-3 ${statusCrmColor(contrato.status_proposta_crm)}`}
                style={{ fontSize: 10 }}
                aria-label="Editar status CRM"
              >
                <SelectValue>
                  {contrato.status_proposta_crm || <span className="italic opacity-80">Sem status CRM</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">— Sem status —</SelectItem>
                {STATUS_OPTIONS.status_proposta_crm.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(contrato as any).subdivisao && (
            <span
              className={`inline-block rounded border px-1.5 py-0.5 font-medium ${SUBDIVISAO_COLORS[(contrato as any).subdivisao] || "bg-muted text-muted-foreground border-border"}`}
              style={{ fontSize: 10 }}
            >
              {(contrato as any).subdivisao}
            </span>
          )}

          {contrato.servico_produto && <p className="text-muted-foreground truncate">{contrato.servico_produto}</p>}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            {contrato.valor > 0 ? (
              <p className="font-semibold text-primary" style={{ fontSize: 12 }}>
                R$ {contrato.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <span className="text-muted-foreground italic" style={{ fontSize: 10 }}>Valor não informado</span>
            )}
            {ultimaMov && (
              <span className="text-muted-foreground whitespace-nowrap" style={{ fontSize: 10 }}>
                {formatDistanceToNow(new Date(ultimaMov), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>

          {ultimaMov && (
            <SlaIndicator
              etapaUpdatedAt={ultimaMov}
              compact
              limit={
                contrato.etapa_atual === "proposta"
                  ? getPropostaSlaLimit(contrato as any)
                  : contrato.etapa_atual === "supervisor"
                  ? getSupervisorSlaLimit(contrato as any)
                  : 7
              }
              tooltipExtra={(contrato as any).ultima_movimentacao_por || undefined}
            />
          )}
          {propostaVencida && (
            <span className="inline-block rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 px-1.5 py-0.5 font-semibold" style={{ fontSize: 10 }}>
              ⚠ Prazo excedido ({getDiasNaProposta(contrato as any)}/{getPropostaSlaLimit(contrato as any)}d)
            </span>
          )}
          {isSupervisorVencida(contrato as any) && (
            <span className="inline-block rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 px-1.5 py-0.5 font-semibold" style={{ fontSize: 10 }}>
              ⚠ Prazo excedido ({getDiasNoSupervisor(contrato as any)}/{getSupervisorSlaLimit(contrato as any)}d)
            </span>
          )}
          {isEspecial && saldoInfo && saldoInfo.total > 0 && (
            <span
              className="inline-block rounded border px-1.5 py-0.5 font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
              style={{ fontSize: 10 }}
              title={`Total R$ ${saldoInfo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · Faturado R$ ${saldoInfo.faturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            >
              💰 Saldo: R$ {saldoInfo.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>

      {/* Progresso por etapa (8 segmentos) */}
      <div
        className="flex gap-[2px] px-1.5 pb-1.5 pt-0.5"
        aria-label={`Etapa ${etapaIdx + 1} de ${ETAPA_ORDER.length}`}
      >
        {ETAPA_ORDER.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= etapaIdx ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
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
  const [onlyAtencao, setOnlyAtencao] = useState(false);

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

  // Ativa filtro "somente em atenção" quando vier ?atencao=1
  useEffect(() => {
    if (searchParams.get("atencao") === "1") {
      setOnlyAtencao(true);
    }
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
    if (onlyAtencao && !isEmAtencao(c as any)) return false;
    return true;
  });

  const byEtapa = (etapaId: string) => filtered.filter((c) => c.etapa_atual === etapaId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (!canMoverStatus(role)) {
      toast({ title: "Sem permissão", description: "Você não pode mover contratos entre etapas.", variant: "destructive" });
      return;
    }

    const contratoId = active.id as string;
    const newEtapa = over.id as string;

    const contrato = contratos.find((c) => c.id === contratoId);
    if (!contrato || contrato.etapa_atual === newEtapa) return;

    const validEtapas = ETAPAS.map((e) => e.id);
    if (!validEtapas.includes(newEtapa as any)) return;

    updateMutation.mutate(
      { id: contratoId, etapa_atual: newEtapa as any },
      {
        onSuccess: () => {
          toast({ title: `Contrato movido para ${ETAPAS.find((e) => e.id === newEtapa)?.label}` });
          // WhatsApp (fire-and-forget)
          notifyEtapaWhatsapp({ contratoId, novaEtapa: newEtapa, etapaAnterior: contrato.etapa_atual });
        },
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
  if (onlyAtencao) activeFilters.push({ key: "atencao", label: "⚠ Somente em atenção", clear: () => setOnlyAtencao(false) });
  const clearAllFilters = () => {
    setSearch(""); setFilterStatus("todos"); setFilterStatusCrm("todos"); setFilterValorMin(""); setFilterValorMax(""); setFilterSubdivisao("todas"); setOnlyAtencao(false);
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
              <Button
                variant={onlyAtencao ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyAtencao((v) => !v)}
                className={`w-full sm:w-auto ${onlyAtencao ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                title="Mostrar apenas processos com prazo excedido ou parados acima do limite"
              >
                ⚠ Somente em atenção
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
                        <div className="flex items-center justify-between gap-2 rounded-md bg-card border border-border/60 px-2 py-1.5 shadow-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              aria-hidden
                              className={`${etapa.colorClass} h-2 w-2 rounded-full shrink-0`}
                            />
                            <span
                              className="font-semibold uppercase truncate text-foreground/90"
                              style={{ fontSize: 11, letterSpacing: "0.04em" }}
                            >
                              {etapa.label}
                            </span>
                          </div>
                          <span
                            className="rounded-full bg-primary/10 text-primary font-semibold px-2 py-0.5 tabular-nums"
                            style={{ fontSize: 10 }}
                          >
                            {items.length}
                          </span>
                        </div>
                        <DroppableColumn etapaId={etapa.id}>
                          {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-muted-foreground py-6 px-2 gap-1.5">
                              <Inbox className="h-5 w-5 opacity-50" aria-hidden />
                              <p className="text-center" style={{ fontSize: 11 }}>
                                {etapa.id === "visita"
                                  ? "Nenhuma visita aqui ainda"
                                  : "Sem itens nesta etapa"}
                              </p>
                            </div>
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
