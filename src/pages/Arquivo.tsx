import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Search, RotateCcw, XCircle, Trash2, Download, FileText, Filter, X, CheckCircle2 } from "lucide-react";
import { useContratosArquivados, useRestaurarContrato } from "@/hooks/useContratos";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { canReabrirContrato } from "@/lib/permissions";
import { ETAPAS, type Entidade } from "@/types/contracts";
import { exportContratosToXlsx, exportContratosToPdf } from "@/lib/export";
import { formatBRL } from "@/lib/currency";

export default function ArquivoPage() {
  useDocumentTitle("Arquivo");
  const { toast } = useToast();
  const role = useUserRole();
  const podeRestaurar = canReabrirContrato(role);
  const { data: itens = [], isLoading } = useContratosArquivados();
  const restoreMutation = useRestaurarContrato();
  const [busca, setBusca] = useState("");
  const [filterEntidade, setFilterEntidade] = useState<string>("todas");
  const [filterMotivo, setFilterMotivo] = useState<string>("todos");
  const [filterEtapa, setFilterEtapa] = useState<string>("todas");
  const [dataDe, setDataDe] = useState<string>("");
  const [dataAte, setDataAte] = useState<string>("");
  const [sortBy, setSortBy] = useState<"data_desc" | "data_asc" | "cliente_asc" | "valor_desc" | "etapa">("data_desc");
  const [showFilters, setShowFilters] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const refDe = dataDe ? new Date(dataDe + "T00:00:00").getTime() : null;
    const refAte = dataAte ? new Date(dataAte + "T23:59:59").getTime() : null;
    const arr = (itens as any[]).filter((c) => {
      if (q) {
        const hay = [
          c.cliente, c.cnpj, c.entidade, c.status_proposta_crm, c.status_rpc,
          c.etapa_atual, c.servico_produto, c.numero_rpc,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterEntidade !== "todas" && c.entidade !== filterEntidade) return false;
      if (filterEtapa !== "todas" && c.etapa_atual !== filterEtapa) return false;
      if (filterMotivo === "excluida" && !c.deleted_at) return false;
      if (filterMotivo === "cancelada" && c.status_proposta_crm !== "Cancelada") return false;
      if (filterMotivo === "perdido" && c.status_proposta_crm !== "Perdido") return false;
      if (filterMotivo === "finalizado" && !c.finalized_at) return false;
      const ref = c.deleted_at ? new Date(c.deleted_at).getTime() : new Date(c.updated_at || c.created_at).getTime();
      if (refDe != null && ref < refDe) return false;
      if (refAte != null && ref > refAte) return false;
      return true;
    });

    arr.sort((a: any, b: any) => {
      switch (sortBy) {
        case "data_asc":
          return +new Date(a.updated_at || a.created_at) - +new Date(b.updated_at || b.created_at);
        case "cliente_asc":
          return String(a.cliente || "").localeCompare(String(b.cliente || ""), "pt-BR");
        case "valor_desc":
          return Number(b.valor || 0) - Number(a.valor || 0);
        case "etapa":
          return String(a.etapa_atual).localeCompare(String(b.etapa_atual));
        case "data_desc":
        default:
          return +new Date(b.updated_at || b.created_at) - +new Date(a.updated_at || a.created_at);
      }
    });
    return arr;
  }, [itens, busca, filterEntidade, filterMotivo, filterEtapa, dataDe, dataAte, sortBy]);

  const handleRestore = (id: string, cliente: string) => {
    restoreMutation.mutate(id, {
      onSuccess: () => toast({ title: `"${cliente}" restaurado ao pipeline` }),
      onError: (e) => toast({ title: "Erro ao restaurar", description: e.message, variant: "destructive" }),
    });
  };

  const etapaLabel = (id: string) => ETAPAS.find((e) => e.id === id)?.label || id;

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (busca) activeFilters.push({ key: "q", label: `Busca: "${busca}"`, clear: () => setBusca("") });
  if (filterEntidade !== "todas") activeFilters.push({ key: "ent", label: `Entidade: ${filterEntidade}`, clear: () => setFilterEntidade("todas") });
  if (filterMotivo !== "todos") activeFilters.push({ key: "mot", label: `Motivo: ${filterMotivo}`, clear: () => setFilterMotivo("todos") });
  if (filterEtapa !== "todas") activeFilters.push({ key: "et", label: `Etapa: ${etapaLabel(filterEtapa)}`, clear: () => setFilterEtapa("todas") });
  if (dataDe) activeFilters.push({ key: "de", label: `De: ${dataDe}`, clear: () => setDataDe("") });
  if (dataAte) activeFilters.push({ key: "ate", label: `Até: ${dataAte}`, clear: () => setDataAte("") });

  const clearAll = () => {
    setBusca(""); setFilterEntidade("todas"); setFilterMotivo("todos");
    setFilterEtapa("todas"); setDataDe(""); setDataAte(""); setSortBy("data_desc");
  };

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Archive className="h-5 w-5" /> Arquivo
            </h1>
            <p className="text-muted-foreground text-sm">Propostas canceladas ou excluídas. Restaure para devolver ao pipeline.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportContratosToXlsx(filtrados as any, `arquivo_${new Date().toISOString().slice(0,10)}.xlsx`)} disabled={filtrados.length === 0}>
              <Download className="mr-2 h-4 w-4" />XLSX
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportContratosToPdf(filtrados as any, `arquivo_${new Date().toISOString().slice(0,10)}.pdf`, "Arquivo de Contratos")} disabled={filtrados.length === 0}>
              <FileText className="mr-2 h-4 w-4" />PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, CNPJ, RPC, serviço..."
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="data_desc">Mais recentes</SelectItem>
              <SelectItem value="data_asc">Mais antigos</SelectItem>
              <SelectItem value="cliente_asc">Cliente (A→Z)</SelectItem>
              <SelectItem value="valor_desc">Maior valor</SelectItem>
              <SelectItem value="etapa">Etapa</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />{showFilters ? "Ocultar filtros" : "Filtros"}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Entidade</label>
              <Select value={filterEntidade} onValueChange={setFilterEntidade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="SESI">SESI Educação</SelectItem>
                  <SelectItem value="SENAI">SENAI Ed. Profissional</SelectItem>
                  <SelectItem value="SESI Saúde">SESI Saúde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Motivo</label>
              <Select value={filterMotivo} onValueChange={setFilterMotivo}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="excluida">Excluída</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Etapa</label>
              <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {ETAPAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input type="date" className="h-8 text-xs" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input type="date" className="h-8 text-xs" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" className="text-xs" onClick={clearAll}>Limpar</Button>
            </div>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="secondary" className="gap-1 pr-1">
                {f.label}
                <button onClick={f.clear} aria-label="Remover" className="rounded hover:bg-background/60 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">{filtrados.length} resultado(s)</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground">
            Nenhum item encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map((c: any) => {
              const isDeleted = !!c.deleted_at;
              const isCancelled = c.status_proposta_crm === "Cancelada";
              const isLost = c.status_proposta_crm === "Perdido";
              const isFinalized = !!c.finalized_at && !isDeleted;
              return (
                <Card key={c.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.cliente}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.cnpj || "—"}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {isFinalized && (
                          <Badge className="gap-1 text-[10px] bg-emerald-600 text-white hover:bg-emerald-600/90">
                            <CheckCircle2 className="h-3 w-3" /> Finalizado
                          </Badge>
                        )}
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
                      {Number(c.valor) > 0 && (
                        <p>Valor: <span className="text-primary font-semibold">R$ {formatBRL(Number(c.valor))}</span></p>
                      )}
                      {c.deleted_at && (
                        <p>Excluída em: {new Date(c.deleted_at).toLocaleString("pt-BR")}</p>
                      )}
                      {c.finalized_at && !c.deleted_at && (
                        <p>Finalizado em: {new Date(c.finalized_at).toLocaleString("pt-BR")}</p>
                      )}
                    </div>
                    <div className="pt-2">
                      {podeRestaurar ? (
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
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic text-center">
                          Apenas Admin ou Coordenador podem restaurar.
                        </p>
                      )}
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