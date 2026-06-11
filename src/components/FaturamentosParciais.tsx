import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, Receipt, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatBRL, formatBRLInput, parseBRL } from "@/lib/currency";
import {
  useFaturamentosParciais,
  useAddFaturamentoParcial,
  useDeleteFaturamentoParcial,
} from "@/hooks/useFaturamentosParciais";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useUserRole } from "@/hooks/useUserRole";

interface Props {
  contratoId: string;
  valorTotal: number;
  disabled?: boolean;
}

export function FaturamentosParciais({ contratoId, valorTotal, disabled = false }: Props) {
  const { data: lista = [], isLoading } = useFaturamentosParciais(contratoId);
  const addMut = useAddFaturamentoParcial();
  const delMut = useDeleteFaturamentoParcial();
  const { profile } = useCurrentUser();
  const { role } = useUserRole();

  const podeExcluir = role === "admin" || role === "gestor" || role === "coordenador";

  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [numeroNota, setNumeroNota] = useState("");

  const totalFaturado = useMemo(
    () => lista.reduce((s, f) => s + Number(f.valor || 0), 0),
    [lista],
  );
  const saldo = Math.max(0, Number(valorTotal || 0) - totalFaturado);
  const pctNum = valorTotal > 0 ? Math.min(100, (totalFaturado / Number(valorTotal)) * 100) : 0;

  const handleAdd = async () => {
    const v = parseBRL(valor);
    if (!v || v <= 0) return;
    await addMut.mutateAsync({
      contrato_id: contratoId,
      valor: v,
      descricao,
      data_faturamento: data,
      numero_nota: numeroNota,
      criado_por_nome: profile?.nome || profile?.email || "Usuário",
    });
    setValor("");
    setDescricao("");
    setNumeroNota("");
    setData(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-3 rounded-md border border-blue-200/50 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Faturamentos parciais</h4>
        </div>
        <Badge variant="outline" className="text-[10px]">{lista.length} lançamentos</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-background border p-2">
          <div className="text-muted-foreground">Valor total</div>
          <div className="font-semibold text-sm">R$ {formatBRL(Number(valorTotal || 0))}</div>
        </div>
        <div className="rounded-md bg-background border p-2">
          <div className="text-muted-foreground">Faturado</div>
          <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">R$ {formatBRL(totalFaturado)}</div>
        </div>
        <div className="rounded-md bg-background border p-2">
          <div className="text-muted-foreground">Saldo</div>
          <div className="font-semibold text-sm">R$ {formatBRL(saldo)}</div>
        </div>
      </div>
      <Progress value={pctNum} className="h-2" />
      <div className="text-[11px] text-muted-foreground text-right">{pctNum.toFixed(1)}% faturado</div>

      {!disabled && (
        <div className="rounded-md border bg-background p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input
                className="h-9 text-sm"
                inputMode="numeric"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(formatBRLInput(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" className="h-9 text-sm" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº Nota Fiscal</Label>
              <Input className="h-9 text-sm" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              className="text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: parcela 1/3 referente à execução do mês X"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={addMut.isPending || !valor}>
              {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Registrar faturamento parcial
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {isLoading && <div className="text-xs text-muted-foreground">Carregando...</div>}
        {!isLoading && lista.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-3">Nenhum faturamento parcial registrado.</div>
        )}
        {lista.map((f) => (
          <div key={f.id} className="flex items-start justify-between gap-2 rounded-md border bg-background p-2 text-xs">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">R$ {formatBRL(Number(f.valor))}</span>
                <span className="text-muted-foreground">·</span>
                <span>{new Date(f.data_faturamento + "T00:00").toLocaleDateString("pt-BR")}</span>
                {f.numero_nota && <Badge variant="outline" className="text-[10px]">NF {f.numero_nota}</Badge>}
              </div>
              {f.descricao && <div className="text-muted-foreground mt-0.5 break-words">{f.descricao}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">por {f.criado_por_nome || "—"}</div>
            </div>
            {podeExcluir && !disabled && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir faturamento parcial?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação será registrada no histórico do contrato.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => delMut.mutate({ id: f.id, contrato_id: contratoId })}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
