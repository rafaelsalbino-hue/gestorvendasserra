import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import { ETAPAS } from "@/types/contracts";
import { useContratos } from "@/hooks/useContratos";
import { useResponsaveis } from "@/hooks/useResponsaveis";

const Dashboard = () => {
  const { data: contratos = [], isLoading: loadC } = useContratos();
  const { data: responsaveis = [], isLoading: loadR } = useResponsaveis();

  const sesiCount = contratos.filter((c) => c.entidade === "SESI").length;
  const senaiCount = contratos.filter((c) => c.entidade === "SENAI").length;
  const emAndamento = contratos.filter((c) => c.etapa_atual !== "faturamento").length;

  const isLoading = loadC || loadR;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos contratos firmados — Educação SESI/SENAI</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Contratos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{contratos.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">SESI: {sesiCount} | SENAI: {senaiCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{emAndamento}</div>
                  <p className="text-xs text-muted-foreground mt-1">Contratos ativos no pipeline</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Responsáveis</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{responsaveis.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cadastrados no sistema</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Ação</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{contratos.filter((c) => c.etapa_atual === "proposta").length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Contratos na etapa inicial</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Pipeline de Etapas</CardTitle></CardHeader>
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
