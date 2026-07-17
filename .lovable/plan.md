## Refatoração do ContratoDetailDialog v2

O dialog atual tem 1.122 linhas e já cobre boa parte do que você descreveu (resumo, histórico, anexos, comentários, faturamentos, CRM, SLA). Vou **refatorar em sub-componentes** e adicionar o que falta, mas com **ajustes ao schema real** — o prompt cita tabelas/colunas que não existem:

### Divergências schema (o que vou usar de verdade)

| Prompt cita | Real no projeto |
|---|---|
| `contrato_etapa_log` | `contratos_historico` (já usado) |
| `responsavel_id` / `supervisor_id` em `contratos` | `agente_pj_id` (→ `responsaveis`); "supervisor" é derivado por entidade/subdivisão |
| `contrato_anexos.url_arquivo/nome_arquivo/tipo` | `storage_path/file_name/mime_type` + URL assinada (já implementado em `useContratoAnexos`) |
| `faturamentos_parciais.observacao` | `descricao` + `numero_nota` + `data_faturamento` |
| Enum `status_negociacao` no banco | Coluna `status_negociacao text` (livre, valores em `statusConfig.ts`) |

### Estrutura final

```
src/components/contrato-detail/
  ContratoDetailDialog.tsx       ← Dialog principal (orquestra tabs, header, footer)
  ContratoDetailHeader.tsx       ← Nome, CNPJ, badges entidade/subdivisão, dropdown status, etapa atual
  ContratoDetailResumo.tsx       ← Tab Resumo (grid 3+2)
  ContratoDetailTimeline.tsx     ← Pipeline vertical (usa ETAPAS + contratos_historico)
  ContratoDetailSLA.tsx          ← Card SLA (reusa lib/sla.ts)
  ContratoDetailAcoes.tsx        ← Avançar / Editar / Duplicar / Arquivar
  ContratoDetailHistorico.tsx    ← Timeline detalhada (contratos_historico)
  ContratoDetailAnexosTab.tsx    ← Wrapper do ContratoAnexos existente
  ContratoDetailFaturamentosTab.tsx ← Wrapper do FaturamentosParciais existente + resumo topo
  ContratoDetailDiagnosticoTab.tsx  ← Botões p/ DiagnosticoWhatsapp/Zapi existentes
src/components/shared/
  StatusNegociacaoDropdown.tsx   ← extraído do KanbanStatusDropdown, reusado nos 2 lugares
```

### O que muda de comportamento

1. **Header**: nome + CNPJ + badges de entidade/subdivisão + `StatusNegociacaoDropdown` (mesmo do Kanban, confirmação em Ganha/Perdido/Cancelada) + linha "Etapa atual" com dot colorido.
2. **Tabs** (shadcn Tabs, sem lazy real — os componentes já são leves): Resumo · Histórico · Anexos · Faturamentos · Diagnóstico.
3. **Resumo**: coluna esquerda com Informações + Responsáveis (agente PJ + supervisor derivado) + Observações editáveis com botão "Salvar" no dirty state. Coluna direita com Timeline + SLA + Ações Rápidas.
4. **Timeline pipeline**: usa `ETAPAS` (9 etapas + finalizado) — feita ✓ verde / atual ● azul / futura ○ cinza, com datas retiradas do `contratos_historico` (eventos `mover_etapa`).
5. **Histórico**: lista completa de `contratos_historico` com autor, timestamp, campo alterado, valor anterior → novo, e (para mudanças de etapa) tempo na etapa anterior.
6. **Anexos**: reusa hooks `useContratoAnexos` (já com upload, delete, signed URL). Só troca layout para grid de cards com ícone por mime, tamanho, autor.
7. **Faturamentos**: reusa `FaturamentosParciais` + adiciona card de resumo no topo (Total faturado / Restante / % + barra) baseado em `valor_total_contrato`.
8. **Diagnóstico**: 2 botões que abrem os diálogos existentes (`DiagnosticoWhatsappDialog`, `DiagnosticoZapiDialog`).
9. **Footer**: "Criado em … • Última atualização …" à esquerda; Fechar + Salvar Alterações (habilita no dirty).
10. **Permissões**: reusa `useUserRole` + `pode_lancar_etapa` (já existe RPC no banco) para Avançar; Arquivar restrito a admin/gestor/coordenador.
11. **Compat**: props `{ contratoId, open, onOpenChange }` — assinatura nova. Vou atualizar os call-sites em `Contratos.tsx`, `KanbanCard.tsx`, `Arquivo.tsx`, `SlaRiscoTable.tsx` etc. para passar `contratoId` em vez do objeto inteiro.
12. **StatusNegociacaoDropdown compartilhado**: `KanbanStatusDropdown` passa a ser wrapper fino sobre ele — zero regressão no Kanban.

### O que **não** vou fazer (para você confirmar se precisa)

- **Não crio novas tabelas** (você pediu para não criar).
- **Duplicar Contrato**: implemento como INSERT client-side copiando campos essenciais (cliente, cnpj, entidade, subdivisão, valores, vigência, unidade) com `etapa_atual='visita'` e `status_negociacao='sem_status'`. Pode ficar assim?
- **Sheet fullscreen no mobile**: mantenho `Dialog` responsivo (max-w-[900px] w-[95vw]). Fazer sheet bottom no mobile é mais 1 arquivo — posso pular pra reduzir risco. OK?
- **Ctrl+S**: implemento se o Salvar do rodapé estiver ativo.
- **Suspense + lazy nas tabs**: pulo — os componentes existentes já são pequenos e a latência do dialog hoje é dominada pelas queries, não pelo bundle.

### Riscos

- É um refactor grande num arquivo central usado em várias telas. Vou trocar assinatura de props e atualizar todos os call-sites no mesmo lote, com typecheck no fim.
- O arquivo antigo (`src/components/ContratoDetailDialog.tsx`) será substituído por um re-export do novo, para não quebrar imports.

Confirma que posso seguir com essa versão (incluindo os 4 itens do "não vou fazer")?