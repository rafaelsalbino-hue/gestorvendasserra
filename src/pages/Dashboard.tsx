import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Users, TrendingUp, Loader2 } from "lucide-react";
import { ETAPAS } from "@/types/contracts";
import { useContratos } from "@/hooks/useContratos";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#ec4899", "#10b981", "#f97316"];

const Dashboard = () => {
  const { data: contratos = [], isLoading: loadC } = useContratos();
  const { data: responsaveis = [], isLoading: loadR } = useResponsaveis();
  const [filterEntidade, setFilterEntidade] = useState<string>("todas");
  const [filterPJ, setFilterPJ] = useState<string>("todos");

  const isLoading = loadC || loadR;

  // Filter by entity
  const filteredByEntidade = filterEntidade === "todas"
    ? contratos
    : contratos.filter((c) => c.entidade === filterEntidade);

  // Get PJ agents for filter dropdown
  const agentesPJ = responsaveis.filter((r) => r.funcao === "Agente de Mercado PJ");

  // For PJ filter we'd need a relationship between contratos and responsaveis
  // For now we filter by matching the agent name in related fields or show all
  const filtered = filteredByEntidade;

  const sesiCount = filtered.filter((c) => c.entidade === "SESI").length;
  const senaiCount = filtered.filter((c) => c.entidade === "SENAI").length;
  const sesiSaudeCount = filtered.filter((c) => c.entidade === "SESI Saúde").length;
  const emAndamento = filtered.filter((c) => c.etapa_atual !== "faturamento").length;

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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Responsáveis</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold">{responsaveis.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cadastrados no sistema</p>
                </CardContent>
              </Card>
            </div>

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
