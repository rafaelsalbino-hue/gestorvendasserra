import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ContratoDash } from "@/hooks/useDashboardData";

interface Props {
  contratos: ContratoDash[];
  isLoading: boolean;
}

const ENTIDADES_TABS = ["SENAI", "SESI Saúde", "SESI Educação", "SESI", "REDE"];

const ETAPA_LABEL: Record<string, string> = {
  visita: "Visita", crm: "CRM", supervisor: "Supervisor", proposta: "Proposta",
  rpc: "RPC", execucao: "Execução", matricula: "Matrícula",
  ensalamento: "Ensalamento", faturamento: "Faturamento",
};

function diasDe(iso?: string | null) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function problemaDe(dias: number) {
  if (dias > 14) return { label: "SLA excedido", cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-300" };
  if (dias >= 7) return { label: `Atenção — ${dias} dias`, cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300" };
  return { label: `Verificar — ${dias} dias`, cls: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300" };
}

export function SituacoesVerificar({ contratos, isLoading }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(ENTIDADES_TABS[0]);

  const pendentes = useMemo(() => {
    return contratos
      .filter((c) => !c.deleted_at && !c.finalized_at && c.etapa_atual !== "finalizado" && c.etapa_updated_at)
      .map((c) => ({ ...c, dias: diasDe(c.etapa_updated_at) }))
      .filter((c) => c.dias > 5)
      .sort((a, b) => b.dias - a.dias);
  }, [contratos]);

  const porEntidade = useMemo(() => {
    const map: Record<string, Record<string, (ContratoDash & { dias: number })[]>> = {};
    ENTIDADES_TABS.forEach((e) => (map[e] = {}));
    pendentes.forEach((c) => {
      const ent = c.entidade;
      if (!map[ent]) map[ent] = {};
      const sub = c.subdivisao || "Sem subdivisão";
      (map[ent][sub] ||= []).push(c);
    });
    return map;
  }, [pendentes]);

  const totalPorEntidade = (ent: string) =>
    Object.values(porEntidade[ent] || {}).reduce((s, l) => s + l.length, 0);

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Situações a Verificar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-40 animate-pulse bg-muted rounded" />
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex flex-wrap h-auto">
              {ENTIDADES_TABS.map((e) => {
                const n = totalPorEntidade(e);
                return (
                  <TabsTrigger key={e} value={e} className="gap-2">
                    {e}
                    {n > 0 ? (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">{n}</Badge>
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {ENTIDADES_TABS.map((e) => {
              const grupos = porEntidade[e] || {};
              const subs = Object.keys(grupos).sort();
              const comPendencia = subs.filter((s) => grupos[s].length > 0);
              return (
                <TabsContent key={e} value={e} className="mt-4">
                  {subs.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Nenhuma pendência em {e}
                    </div>
                  ) : (
                    <Accordion type="multiple" defaultValue={comPendencia}>
                      {subs.map((sub) => {
                        const itens = grupos[sub];
                        return (
                          <AccordionItem key={sub} value={sub}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{e} — {sub}</span>
                                {itens.length > 0 ? (
                                  <Badge variant="destructive" className="h-5 px-2 text-[10px]">{itens.length} pendência{itens.length > 1 ? "s" : ""}</Badge>
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="divide-y">
                                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase text-muted-foreground py-2">
                                  <div className="col-span-4">Cliente</div>
                                  <div className="col-span-2">Etapa</div>
                                  <div className="col-span-1 text-right">Dias</div>
                                  <div className="col-span-3">Problema</div>
                                  <div className="col-span-2 text-right">Ação</div>
                                </div>
                                {itens.map((c) => {
                                  const p = problemaDe(c.dias);
                                  return (
                                    <div key={c.id} className="grid grid-cols-12 gap-2 items-center py-2 text-sm">
                                      <div className="col-span-4 font-medium truncate">{c.cliente}</div>
                                      <div className="col-span-2 text-muted-foreground truncate">{ETAPA_LABEL[c.etapa_atual] || c.etapa_atual}</div>
                                      <div className="col-span-1 text-right font-semibold">{c.dias}d</div>
                                      <div className="col-span-3">
                                        <Badge variant="outline" className={`${p.cls} font-medium`}>{p.label}</Badge>
                                      </div>
                                      <div className="col-span-2 flex justify-end">
                                        <Button size="sm" variant="ghost" className="h-7 gap-1"
                                          onClick={() => navigate(`/contratos?highlight=${c.id}`)}>
                                          <ExternalLink className="w-3.5 h-3.5" /> Ver
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}