import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { FUNCOES_RESPONSAVEL, ETAPAS } from "@/types/contracts";
import { usePermissoesEtapa, useTogglePermissaoEtapa, type AcaoPermissao } from "@/hooks/usePermissoesEtapa";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const ACOES: { key: AcaoPermissao; label: string }[] = [
  { key: "pode_criar", label: "Criar" },
  { key: "pode_editar", label: "Editar" },
  { key: "pode_avancar", label: "Avançar etapa" },
];

export function MatrizPermissoesEtapas({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: permissoes = [], isLoading } = usePermissoesEtapa();
  const toggle = useTogglePermissaoEtapa();

  const map = useMemo(() => {
    const m = new Map<string, { pode_criar: boolean; pode_editar: boolean; pode_avancar: boolean }>();
    for (const p of permissoes) m.set(`${p.etapa}|${p.funcao}`, p);
    return m;
  }, [permissoes]);

  const countAtivos = (etapa: string) =>
    permissoes.filter((p) => p.etapa === etapa && (p.pode_criar || p.pode_editar || p.pode_avancar)).length;

  const onToggle = (etapa: string, funcao: string, acao: AcaoPermissao, valor: boolean) => {
    toggle.mutate(
      { etapa, funcao, acao, valor },
      {
        onSuccess: () => toast.success(`${acao.replace("pode_", "")} ${valor ? "ativado" : "desativado"} para ${funcao} em ${etapa}`),
        onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Permissões por etapa</DialogTitle>
          <DialogDescription>
            Defina, por cargo, quem pode <b>criar</b>, <b>editar</b> e <b>avançar</b> processos em cada etapa. Admin/Gestor/Coordenador e Backoffice mantêm acesso pleno por padrão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando matriz...
          </div>
        ) : (
          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-muted z-20 min-w-[260px]">Cargo</th>
                  {ETAPAS.map((e) => (
                    <th key={e.id} className="p-2 text-center min-w-[140px]">
                      <div className="font-semibold">{e.label}</div>
                      <Badge variant="secondary" className="mt-1">{countAtivos(e.id)} cargos</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FUNCOES_RESPONSAVEL.map((funcao) => (
                  <tr key={funcao} className="border-t hover:bg-muted/30">
                    <td className="p-2 sticky left-0 bg-background font-medium">{funcao}</td>
                    {ETAPAS.map((e) => {
                      const cell = map.get(`${e.id}|${funcao}`);
                      const ativos =
                        (cell?.pode_criar ? 1 : 0) +
                        (cell?.pode_editar ? 1 : 0) +
                        (cell?.pode_avancar ? 1 : 0);
                      return (
                        <td key={e.id} className="p-2 text-center">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={`w-full rounded px-2 py-1 text-xs border ${
                                  ativos === 3
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                                    : ativos > 0
                                    ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {ativos === 0 ? "—" : `${ativos}/3`}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 space-y-3">
                              <div className="text-xs font-semibold text-muted-foreground">
                                {funcao} · {e.label}
                              </div>
                              {ACOES.map((a) => (
                                <div key={a.key} className="flex items-center justify-between">
                                  <span className="text-sm">{a.label}</span>
                                  <Switch
                                    checked={!!cell?.[a.key]}
                                    onCheckedChange={(v) => onToggle(e.id, funcao, a.key, v)}
                                  />
                                </div>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}