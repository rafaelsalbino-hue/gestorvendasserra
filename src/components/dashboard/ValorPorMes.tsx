import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ContratoDash } from "@/hooks/useDashboardData";
import { formatBRLFull } from "@/hooks/useDashboardData";

interface Props {
  contratos: ContratoDash[];
  isLoading: boolean;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ValorPorMes({ contratos, isLoading }: Props) {
  const now = new Date();
  const buckets: { mes: string; valor: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ mes: MESES[d.getMonth()], valor: 0 });
  }
  const inicio = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  contratos.forEach((c) => {
    if (c.deleted_at) return;
    const d = new Date(c.created_at);
    if (d < inicio) return;
    const idx = (d.getFullYear() - inicio.getFullYear()) * 12 + (d.getMonth() - inicio.getMonth());
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].valor += Number(c.valor_total_contrato || c.valor || 0);
    }
  });

  const data = buckets.map((b, i) => {
    const slice = buckets.slice(Math.max(0, i - 2), i + 1);
    const media = slice.reduce((a, x) => a + x.valor, 0) / slice.length;
    return { mes: b.mes, valor: Math.round(b.valor / 1000), media: Math.round(media / 1000) };
  });

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Valor por Mês (R$ mil)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v: number) => formatBRLFull(v * 1000)}
              />
              <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Valor" />
              <Line type="monotone" dataKey="media" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Tendência" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}