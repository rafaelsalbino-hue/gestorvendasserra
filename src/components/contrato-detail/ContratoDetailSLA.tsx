import { AlertTriangle, Clock } from "lucide-react";
import { getDiasParado } from "@/lib/sla";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

export function ContratoDetailSLA({ contrato }: { contrato: Contrato }) {
  const dias = getDiasParado(contrato as any);
  const limite = 14;
  const pct = Math.min(100, Math.round((dias / limite) * 100));

  const tone =
    dias > limite
      ? {
          card: "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
          text: "text-red-700 dark:text-red-300",
          bar: "bg-red-500",
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        }
      : dias >= Math.ceil(limite / 2)
      ? {
          card: "border-yellow-300 bg-yellow-50 dark:border-yellow-900/60 dark:bg-yellow-950/30",
          text: "text-yellow-800 dark:text-yellow-300",
          bar: "bg-yellow-500",
          icon: <Clock className="h-4 w-4 text-yellow-600" />,
        }
      : {
          card: "border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30",
          text: "text-green-800 dark:text-green-300",
          bar: "bg-green-500",
          icon: <Clock className="h-4 w-4 text-green-600" />,
        };

  return (
    <div className={`rounded-lg border p-3 ${tone.card}`}>
      <div className="flex items-center gap-2">
        {tone.icon}
        <span className={`text-sm font-semibold ${tone.text}`}>
          {dias} {dias === 1 ? "dia" : "dias"} nesta etapa
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-background/60 overflow-hidden">
        <div
          className={`h-full transition-all ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Limite recomendado: {limite} dias
      </p>
    </div>
  );
}