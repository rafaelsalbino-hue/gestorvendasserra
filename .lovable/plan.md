## Problema

Ao salvar a observação no dialog de detalhes, aparece o erro:
`Could not find the 'observacoes' column of 'contratos' in the schema cache`

A tabela `contratos` não tem coluna `observacoes`. Existem apenas colunas por etapa:
- `observacoes_visita`
- `observacoes_crm`
- `observacoes_proposta`
- `observacao_terceiro`

O `ContratoDetailResumo.tsx` estava lendo/escrevendo em `c.observacoes` (inexistente), então nunca carregava valor e o save falhava.

## Correção

Ajustar `src/components/contrato-detail/ContratoDetailResumo.tsx` para mapear pela etapa atual do contrato:

- `visita` → `observacoes_visita`
- `crm` → `observacoes_crm`
- demais etapas (`supervisor`, `proposta`, `rpc`, `execucao`, `matricula`, `ensalamento`, `faturamento`, `finalizado`) → `observacoes_proposta` (é o campo geral do processo comercial já usado no `ContratoEditDialog`)

Mudanças:

1. Derivar `obsField` a partir de `c.etapa_atual` com o mapeamento acima.
2. Inicializar/atualizar o `useState` lendo `c[obsField]` em vez de `c.observacoes`.
3. Na label da seção, mostrar de forma discreta em qual etapa a observação será salva (ex.: "Observações (Proposta)") para o usuário entender o contexto.
4. No `update.mutate`, enviar `{ id, [obsField]: obs, etapa_updated_at: new Date().toISOString() }` — mantém o reset de SLA já existente.
5. Ajustar `ContratoDetailAcoes.tsx` (duplicar contrato) para copiar os três campos `observacoes_visita`, `observacoes_crm`, `observacoes_proposta` em vez de `observacoes`.

Sem alterações de schema, sem mudanças em outros componentes.