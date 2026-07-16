import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { useNavigate } from "react-router-dom";
import type { ContratoDash } from "@/hooks/useDashboardData";

const ETAPAS_ORDEM: { id: string; label: string }[] = [
  { id: "visita", label: "Visita" },
  { id: "crm", label: "CRM" },
  { id: "supervisor", label: "Supervisor" },
  { id: "proposta", label: "Proposta" },
  { id: "rpc", label: "RPC" },
  { id: "execucao", label: "Execução" },
  { id: "matricula", label: "Matrícula" },
  { id: "ensalamento", label: "Ensalamento" },
  { id: "faturamento", label: "Faturamento" },
  { id: "finalizado", label: "Finalizado" },
];

// Azul -> Verde
const CORES = ["#3b82f6", "#4f8ff0", "#5c9de0", "#5fa9c9", "#4fb2ac", "#3fb995", "#2fbf7f", "#1fc46a", "#14ca55", "#10b981"];

interface Props {
  contratos: ContratoDash[];
  isLoading: boolean;
  filtroQS?: string;
}

export function FunilConversao({ contratos, isLoading, filtroQS = "" }: Props) {
  const navigate = useNavigate();
  const dados = ETAPAS_ORDEM.map((e, i) => ({
    etapa: e.label,
    etapaId: e.id,
    count: contratos.filter((c) => !c.deleted_at && c.etapa_atual === e.id).length,
    fill: CORES[i],
  }));

  return (
    <Card className="rounded-xl shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Funil de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[360px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 32, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis type="category" dataKey="etapa" width={100} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />
              <Bar
                dataKey="count"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={(d: any) => {
                  const sep = filtroQS ? "&" : "?";
                  navigate(`/contratos${filtroQS}${sep}etapa=${d.etapaId}`);
                }}
              >
                {dados.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
                <LabelList dataKey="count" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}