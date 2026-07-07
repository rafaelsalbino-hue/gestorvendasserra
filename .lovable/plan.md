# Plano de implementação — Separação CRM / Proposta + melhorias

## 1. Migração de banco (uma migration SQL)

**Renomear enum + adicionar novo valor:**
- `ALTER TYPE etapa_contrato RENAME VALUE 'proposta' TO 'crm'` — os 37 registros atuais em 'proposta' passam a 'crm' automaticamente (a UI atual "Proposta / CRM" corresponde à etapa CRM).
- `ALTER TYPE etapa_contrato ADD VALUE 'proposta' AFTER 'supervisor'` — nova etapa 4 (fica vazia).

**Novas colunas em `contratos`:**
- `observacoes_crm text`
- `prazo_crm_dias int default 4`
- `valor_final_proposta numeric`
- `arquivo_proposta_url text`
- `observacoes_proposta text`

**Ajustes em funções/triggers que referenciam literal 'proposta':**
- `compute_acao_esperada()` — adicionar case 'crm' e ajustar 'proposta' para nova descrição.
- `registrar_entrada_proposta()` / `registrar_entrada_proposta_ins()` — passar a monitorar 'crm' (mantém coluna `data_entrada_etapa_proposta` — só semântica, agora rastreia CRM SLA de 4 dias).
- `auto_advance_visita_proposta()` — agora avança visita → 'crm'.
- `notify_contrato_change()` — nenhuma mudança estrutural (opera por etapa_atual dinâmica).

## 2. Frontend — tipos e labels (1 arquivo central)

`src/types/contracts.ts`:
- `EtapaContrato` adiciona `"crm"`, mantém `"proposta"` (nova posição 4).
- `ETAPAS` reordenado com 9 entradas: visita, crm, supervisor, proposta, rpc, execucao, matricula, ensalamento, faturamento (labels: "CRM", "Proposta", "PCP" etc. conforme spec).

## 3. Validação de etapas
`src/hooks/useEtapaValidation.ts` — regras para `crm` (status_proposta_crm, numero_rpc/CRM) e nova `proposta` (dados_proposta, valor_final_proposta).

## 4. Componente de detalhe do contrato
`src/components/ContratoDetailDialog.tsx` — separar bloco CRM (Status, Nº CRM, prazo 4d, observações) do bloco Proposta (dados, valor final, upload arquivo, observações). Aba SENAI já existente permanece.

## 5. Matriz de notificações (UI)
`src/components/MatrizNotificacoes.tsx` — array `ETAPAS` local ganha `{ value: "crm", label: "CRM" }` na posição 2 e mantém `{ value: "proposta", label: "Proposta" }` na 4. Nenhum schema muda (a tabela `notificacao_permissoes` já usa o enum).

`src/components/MatrizPermissoesEtapas.tsx` — mesmo tratamento.

## 6. WhatsApp — Edge function `enviar-whatsapp`
Atualizar o roteamento por etapa conforme mapeamento da Melhoria 2 (visita→backoffice, crm→supervisor+coord+comercial, supervisor→backoffice+..., proposta→backoffice+..., rpc→agente+supervisor+..., matricula→PCP+..., ensalamento(PCP)→interlocutora+..., faturamento→analista+coord).

## 7. Kanban / Dashboard / Arquivo
- `src/pages/Contratos.tsx` — passar a montar 9 colunas a partir de ETAPAS; contador `(N)` em cada header (Melhoria 4c); barra de progresso etapa X/9 no rodapé do card (4a); tooltip nos badges de prazo excedido (4b); filtro Unidade de Atendimento visível quando entidade = SENAI ou "Todas" (4d).
- `src/pages/Dashboard.tsx` — mesmo filtro de Unidade + atualizar labels das etapas.
- `src/pages/Arquivo.tsx`, `NovoContratoDialog`, `ImportarVisitasDialog`, `GlobalSearch`, `DiagnosticoWhatsappDialog`, `useContratos.ts` — apenas ajuste de labels/refs onde referem etapa "Proposta / CRM".

## 8. Backfill / Dados
- Nenhum UPDATE necessário: `ALTER TYPE RENAME VALUE` reaproveita os 37 registros existentes como 'crm'.

## Entrega
Ao final, listarei:
- A migration SQL gerada.
- Todos os arquivos alterados.

Confirma para eu executar?