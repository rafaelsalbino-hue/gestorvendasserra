import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import { ETAPAS } from "@/types/contracts";
import { useContratos } from "@/hooks/useContratos";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#ec4899", "#10b981", "#f97316"];

const Dashboard = () => {
  const { data: contratos = [], isLoading: loadC } = useContratos();
  const { data: responsaveis = [], isLoading: loadR } = useResponsaveis();

  const sesiCount = contratos.filter((c) => c.entidade === "SESI").length;
  const senaiCount = contratos.filter((c) => c.entidade === "SENAI").length;
  const sesiSaudeCount = contratos.filter((c) => c.entidade === "SESI Saúde").length;
  const emAndamento = contratos.filter((c) => c.etapa_atual !== "faturamento").length;

  const isLoading = loadC || loadR;

  const etapaChartData = ETAPAS.map((e) => ({
    name: e.label,
    quantidade: contratos.filter((c) => c.etapa_atual === e.id).length,
  }));

  const entidadeChartData = [
    { name: "SESI Educação", value: sesiCount },
    { name: "SENAI", value: senaiCount },
    { name: "SESI Saúde", value: sesiSaudeCount },
  ].filter((d) => d.value > 0);

  const valorPorEtapa = ETAPAS.map((e) => ({
    name: e.label,
    valor: contratos.filter((c) => c.etapa_atual === e.id).reduce((sum, c) => sum + c.valor, 0),
  }));

  const valorTotal = contratos.reduce((sum, c) => sum + c.valor, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos contratos — SESI/SENAI</p>
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
                  <div className="text-2xl md:text-3xl font-bold">{contratos.length}</div>
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
                      <span className="text-lg font-semibold">{contratos.filter((c) => c.etapa_atual === etapa.id).length}</span>
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
