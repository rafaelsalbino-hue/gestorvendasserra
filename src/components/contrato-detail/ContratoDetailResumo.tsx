import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/currency";
import { useAddComentario } from "@/hooks/useContratoComentarios";
import { useResponsaveis } from "@/hooks/useResponsaveis";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { ContratoDetailTimeline } from "./ContratoDetailTimeline";
import { ContratoDetailSLA } from "./ContratoDetailSLA";
import { ContratoDetailAcoes } from "./ContratoDetailAcoes";
import type { Tables } from "@/integrations/supabase/types";

type Contrato = Tables<"contratos">;

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 break-words">
        {value ?? <span className="text-muted-foreground italic">—</span>}
      </div>
    </div>
  );
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return null;
  }
}

export function ContratoDetailResumo({
  contrato,
  onEdit,
  onClose,
}: {
  contrato: Contrato;
  onEdit: () => void;
  onClose: () => void;
}) {
  const c = contrato as any;
  const addComentario = useAddComentario();
  const { currentUser } = useCurrentUser();
  const { data: responsaveis = [] } = useResponsaveis();

  const [obs, setObs] = useState<string>("");
  useEffect(() => setObs(""), [c.id]);
  const dirty = obs.trim().length > 0;
  const savingObs = addComentario.isPending;

  const agente = responsaveis.find((r: any) => r.id === c.agente_pj_id) as any;

  const handleSaveObservation = async () => {
    const texto = obs.trim();
    if (!texto) return;

    try {
      await addComentario.mutateAsync({
        contrato_id: contrato.id,
        texto,
        autor_nome: currentUser?.nome || "Usuário",
        autor_funcao: currentUser?.funcao || "",
        silent: true,
      });
      setObs("");
      toast.success("Observação registrada nos comentários", {
        description: "SLA da etapa foi reiniciado.",
      });
    } catch (e: any) {
      toast.error("Erro ao salvar observação", { description: e?.message });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Coluna esquerda */}
      <div className="lg:col-span-3 space-y-5">
        <section>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
            Informações do Contrato
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field
              label="Valor Total"
              value={
                c.valor_total_contrato ? (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {formatBRL(Number(c.valor_total_contrato))}
                  </span>
                ) : null
              }
            />
            <Field
              label="Valor Mensal"
              value={c.valor ? `R$ ${formatBRL(Number(c.valor))}` : null}
            />
            <Field label="Tipo" value={c.tipo_contrato} />
            <Field label="Serviço/Produto" value={c.servico_produto} />
            <Field label="Início Vigência" value={fmtDate(c.inicio_vigencia)} />
            <Field label="Fim Vigência" value={fmtDate(c.fim_vigencia)} />
            {c.unidade_atendimento && (
              <Field label="Unidade de Atendimento" value={c.unidade_atendimento} />
            )}
            {c.dias_atendimento && (
              <Field label="Dias de Atendimento" value={c.dias_atendimento} />
            )}
            {(c.horario_inicio || c.horario_fim) && (
              <Field
                label="Horário"
                value={`${c.horario_inicio ?? "—"} - ${c.horario_fim ?? "—"}`}
              />
            )}
          </div>
        </section>

        <div className="border-t" />

        <section>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">
            Responsáveis
          </h3>
          <div className="space-y-2">
            {agente ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(agente.nome)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{agente.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {agente.funcao ?? "Agente PJ"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Agente PJ não atribuído
              </p>
            )}
          </div>
        </section>

        <div className="border-t" />

        <section>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
            Observações <span className="normal-case font-normal text-muted-foreground/80">(Comentários)</span>
          </h3>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Registre uma observação nos comentários deste contrato..."
            className="min-h-[80px] resize-y text-sm"
          />
          {dirty && (
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleSaveObservation}
                disabled={savingObs}
              >
                {savingObs ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-2 h-3.5 w-3.5" />
                )}
                Salvar
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Coluna direita */}
      <div className="lg:col-span-2 space-y-5">
        <ContratoDetailTimeline
          contratoId={contrato.id}
          etapaAtual={(contrato as any).etapa_atual}
        />
        <ContratoDetailSLA contrato={contrato} />
        <ContratoDetailAcoes contrato={contrato} onEdit={onEdit} onClose={onClose} />
      </div>
    </div>
  );
}