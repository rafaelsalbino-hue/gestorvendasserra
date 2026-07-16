import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ContratoDash } from "@/hooks/useDashboardData";

const CORES_ENTIDADE: Record<string, string> = {
  "SENAI": "#3b82f6",
  "SESI Saúde": "#06b6d4",
  "SESI Educação": "#8b5cf6",
  "SESI": "#6366f1",
  "REDE": "#f59e0b",
};

interface Props {
  contratos: ContratoDash[];
  isLoading: boolean;
}

export function ContratosPorEntidade({ contratos, isLoading }: Props) {
  const ativos = contratos.filter((c) => !c.deleted_at && c.etapa_atual !== "finalizado");
  const mapa = new Map<string, number>();
  ativos.forEach((c) => mapa.set(c.entidade, (mapa.get(c.entidade) || 0) + 1));
  const total = ativos.length || 1;
  const data = Array.from(mapa.entries()).map(([entidade, count]) => ({
    name: entidade,
    value: count,
    pct: ((count / total) * 100).toFixed(1),
  }));

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Contratos por Entidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Sem contratos ativos
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={CORES_ENTIDADE[d.name] || `hsl(${i * 60},70%,55%)`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number, _n, p: any) => [`${v} (${p.payload.pct}%)`, p.payload.name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-1.5">
              {data.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: CORES_ENTIDADE[d.name] || "#999" }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">{d.value} · {d.pct}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}