import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, TrendingUp, Clock, AlertTriangle, CheckCircle2, Plus, ListChecks, Users, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ETAPAS, SUBDIVISIONS_BY_UNIT } from "@/types/contracts";
import { useContratos } from "@/hooks/useContratos";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { SlaIndicator } from "@/components/SlaIndicator";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCountUp } from "@/hooks/useCountUp";

function greeting(name?: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const first = (name || "").split(" ")[0] || "";
  return first ? `${part}, ${first}!` : `${part}!`;
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const v = useCountUp(value);
  return <div className={className}>{v.toLocaleString("pt-BR")}</div>;
}

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#ec4899", "#10b981", "#f97316"];

// Helpers
function getDaysInStage(etapaUpdatedAt: string): number {
  const updated = new Date(etapaUpdatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Agora há pouco";
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { data: contratos = [], isLoading: loadC } = useContratos();
  const { data: responsaveis = [], isLoading: loadR } = useResponsaveis();
  const [filterEntidade, setFilterEntidade] = useState<string>("todas");
  const [filterPJ, setFilterPJ] = useState<string>("todos");
  const [filterSubdivisao, setFilterSubdivisao] = useState<string>("todas");

  const isLoading = loadC || loadR;

  // Filter by entity
  const filteredByEntidade = filterEntidade === "todas"
    ? contratos
    : contratos.filter((c) => c.entidade === filterEntidade);

  // Get PJ agents for filter dropdown
  const agentesPJ = responsaveis.filter((r) => r.funcao === "Agente de Mercado PJ");

  // Filter by PJ agent (uses agente_pj_id field)
  const filteredByPJ = filterPJ === "todos"
    ? filteredByEntidade
    : filteredByEntidade.filter((c) => (c as any).agente_pj_id === filterPJ);

  const subdivisaoEnabled = filterEntidade === "SESI Saúde";
  const filtered = subdivisaoEnabled && filterSubdivisao !== "todas"
    ? filteredByPJ.filter((c) => (c as any).subdivisao === filterSubdivisao)
    : filteredByPJ;

  const sesiCount = filtered.filter((c) => c.entidade === "SESI").length;
  const senaiCount = filtered.filter((c) => c.entidade === "SENAI").length;
  const sesiSaudeCount = filtered.filter((c) => c.entidade === "SESI Saúde").length;
  const emAndamento = filtered.filter((c) => c.etapa_atual !== "faturamento").length;
  const concluidos = filtered.filter((c) => c.etapa_atual === "faturamento").length;
  const taxaConclusao = filtered.length > 0 ? Math.round((concluidos / filtered.length) * 100) : 0;

  const etapaChartData = ETAPAS.map((e) => ({
    name: e.label,
    quantidade: filtered.filter((c) => c.etapa_atual === e.id).length,
  }));

  const entidadeChartData = [
    { name: "SESI Educação", value: sesiCount },
    { name: "SENAI", value: senaiCount },
    { name: "SESI Saúde", value: sesiSaudeCount },
  ].filter((d) => d.value > 0);

  const valorPorEtapa = ETAPAS.map((e) => ({
    name: e.label,
    valor: filtered.filter((c) => c.etapa_atual === e.id).reduce((sum, c) => sum + c.valor, 0),
  }));

  const valorTotal = filtered.reduce((sum, c) => sum + c.valor, 0);

  // SLA - contratos parados há mais de 5 dias
  const contratosAtrasados = filtered
    .filter((c) => c.etapa_atual !== "faturamento" && (c as any).etapa_updated_at)
    .filter((c) => getDaysInStage((c as any).etapa_updated_at) > 5)
    .sort((a, b) => getDaysInStage((b as any).etapa_updated_at) - getDaysInStage((a as any).etapa_updated_at))
    .slice(0, 8);

  // Activity feed - recent changes (last updated contracts)
  const recentActivity = [...filtered]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos contratos — SESI/SENAI</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Entidade</Label>
            <Select value={filterEntidade} onValueChange={setFilterEntidade}>
              <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Entidades</SelectItem>
                <SelectItem value="SESI">SESI Educação</SelectItem>
                <SelectItem value="SENAI">SENAI Ed. Profissional</SelectItem>
                <SelectItem value="SESI Saúde">SESI Saúde</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Agente PJ</Label>
            <Select value={filterPJ} onValueChange={setFilterPJ}>
              <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Agentes</SelectItem>
                {agentesPJ.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {subdivisaoEnabled && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Área</Label>
              <Select value={filterSubdivisao} onValueChange={setFilterSubdivisao}>
                <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as áreas</SelectItem>
                  {(SUBDIVISIONS_BY_UNIT["SESI Saúde"] || []).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-[290px] w-full rounded-lg" />
              <Skeleton className="h-[290px] w-full rounded-lg" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Contratos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold">{filtered.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">SESI: {sesiCount} | SENAI: {senaiCount} | Saúde: {sesiSaudeCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold">{emAndamento}</div>
                  <p className="text-xs text-muted-foreground mt-1">Contratos ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground mt-1">Soma de todos os contratos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold">{taxaConclusao}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{concluidos} concluído(s) · {responsaveis.length} resp.</p>
                </CardContent>
              </Card>
            </div>

            {/* SLA Alert */}
            {contratosAtrasados.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Contratos com Atenção ({contratosAtrasados.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contratosAtrasados.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.cliente}</p>
                          <p className="text-xs text-muted-foreground">
                            {ETAPAS.find((e) => e.id === c.etapa_atual)?.label} · {c.entidade}
                          </p>
                        </div>
                        {(c as any).etapa_updated_at && (
                          <SlaIndicator etapaUpdatedAt={(c as any).etapa_updated_at} />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Contratos por Etapa</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={etapaChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Distribuição por Entidade</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={entidadeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {entidadeChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Valor (R$) por Etapa</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={valorPorEtapa}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      <Bar dataKey="valor" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Atividade Recente</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente</p>
                    ) : (
                      recentActivity.map((c) => (
                        <div key={c.id} className="flex items-start gap-3 text-sm">
                          <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{c.cliente}</p>
                            <p className="text-xs text-muted-foreground">
                              {ETAPAS.find((e) => e.id === c.etapa_atual)?.label} · {c.entidade}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(c.updated_at)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Pipeline de Etapas</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {ETAPAS.map((etapa) => (
                    <div key={etapa.id} className="flex items-center gap-2">
                      <Badge className={etapa.colorClass + " text-xs"}>{etapa.label}</Badge>
                      <span className="text-sm text-muted-foreground">{etapa.responsavel}</span>
                      <span className="text-lg font-semibold">{filtered.filter((c) => c.etapa_atual === etapa.id).length}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
