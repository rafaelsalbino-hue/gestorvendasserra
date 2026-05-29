# Rodada 5 — Segurança, Importação e Refinamentos

Plano de execução em ordem de dependência (banco → backend → frontend).

## 1. Banco de dados (migração única)

### 1.1 Enum `app_role`
- Adicionar valores: `admin`, `vendedor`, `secretaria`, `interlocutora`, `coordenador` (manter `gestor`, `backoffice`, `operador` por compat).
- Atualizar `handle_new_user` para mapear funções → roles:
  - Coordenador de Mercado / Analista Comercial → `admin` + `gestor`
  - Coordenador SESI/SENAI → `coordenador`
  - Backoffice Comercial → `backoffice`
  - Agente de Mercado PJ → `vendedor`
  - Secretaria → `secretaria`
  - Interlocutora de Faturamento → `interlocutora`
  - Demais → `operador`

### 1.2 Funções helper
- `is_admin(uuid)`, `is_backoffice(uuid)`, `is_vendedor(uuid)`, `is_coordenador(uuid)` (security definer, lendo `user_roles`).
- `can_edit_contrato(uuid, uuid)` → admin/gestor/backoffice/coordenador OR (vendedor AND agente_pj_id = responsavel do user).
- `can_finalize_contrato(uuid)` → admin/gestor/backoffice/coordenador.

### 1.3 RLS endurecida
- `contratos`:
  - SELECT: vendedor vê só onde `agente_pj_id` corresponde ao seu `responsaveis.id`; demais autenticados veem tudo.
  - INSERT: admin/gestor/vendedor.
  - UPDATE: `can_edit_contrato(auth.uid(), id)`; bloquear edição se `finalized_at IS NOT NULL` e user é vendedor.
  - DELETE: já gestor-only ✓.
- `contrato_arquivos` / `contrato_anexos`: SELECT exige que o user enxergue o contrato (subselect em contratos com RLS).
- `notificacoes`, `user_roles`, `responsaveis` — manter.

### 1.4 Auditoria
- Nova tabela `audit_log` (id, user_id, user_email, acao, entidade, entidade_id, detalhes jsonb, ip text, created_at). RLS: SELECT admin/gestor; INSERT authenticated; sem UPDATE/DELETE.
- Trigger em `contratos` (INSERT/UPDATE/DELETE) gravando ação resumida.

### 1.5 Finalização
- Adicionar `finalized_at timestamptz`, `finalized_by uuid`, `finalized_by_nome text` em `contratos`.
- Adicionar valor `'finalizado'` ao enum `etapa_contrato`.

### 1.6 SESI Educação
- Seed via `INSERT` em `unit_subdivisions`: `Contraturno` e `ACE` para `unit_name = 'SESI Educação'`.
- Adicionar `"SESI Educação"` ao enum `entidade` (se ainda não existir — verificar).

## 2. Frontend

### 2.1 `src/types/contracts.ts`
- `Entidade` inclui `"SESI Educação"`.
- `SUBDIVISIONS_BY_UNIT["SESI Educação"] = ["Contraturno", "ACE"]`.
- `SUBDIVISAO_COLORS` para novas opções.
- Adicionar etapa `finalizado` em `ETAPAS`.

### 2.2 `useUserRole.ts`
- Estender `AppRole` para novos valores. Expor `isAdmin`, `isBackoffice`, `isVendedor`, `isCoordenador`, `isSecretaria`, `isInterlocutora`.

### 2.3 RBAC permissions (`src/lib/permissions.ts` novo)
- `canCreate`, `canEdit(contrato, user)`, `canMoveStatus`, `canFinalize`, `canImport`, `canDelete` — fonte única de verdade.

### 2.4 ImportarVisitasDialog
- Modelo XLSX com cabeçalhos exatos da especificação.
- Aceitar `.csv` adicional (parse via `XLSX.read`).
- Validações por linha: Entidade ∈ enum; Subdivisão compatível; Cliente obrigatório; Data DD/MM/AAAA → ISO; CNPJ formato; Valor decimal BRL.
- Tabela de prévia com linhas inválidas destacadas (border-destructive) + tooltip do erro.
- Botão "Importar válidas" permite import parcial.
- Toast final com contagem + botão "Baixar relatório de erros (CSV)".
- Rejeitar mime ≠ xlsx/csv com mensagem.
- Tratar planilha vazia.

### 2.5 Kanban (`Contratos.tsx`)
- Card mostra badge `status_proposta_crm` (cor distinta) abaixo do cliente. "Sem status CRM" cinza quando vazio.
- Edição inline via popover `StatusSelect`.
- Filtros: separar `filtroEtapa` e `filtroStatusCrm`.
- Filtro Entidade × Área: ao mudar Entidade, limpar e recarregar Área.

### 2.6 Finalização (ContratoDetailDialog)
- Botão "Finalizar Processo" visível para `canFinalize`.
- AlertDialog com resumo (cliente, entidade, valor, etapa).
- Action: `update` setando `finalized_at`, `finalized_by`, `etapa_atual='finalizado'`.
- Bloquear edição quando finalizado para vendedor.

### 2.7 Página Arquivo
- Filtro adicional "Finalizados".

### 2.8 Gaps
- G1: `parseBRL` para "12000,00" e "12.000,00" → garantir parser cobre ambos no import.
- G3: gerar CSV de erros via Blob.
- G4: revisar `AppSessionContext` (já tem refresh) — sem mudança necessária além de garantir interval.

## 3. Testes manuais
- Import com 4 cenários (válido, parcial, vazio, .docx).
- Login com cada perfil simulado e verificar botões + tentativa de update direto.

## Arquivos
- **Migração**: `supabase/migrations/<ts>_rodada5.sql`
- **Novos**: `src/lib/permissions.ts`
- **Editados**: `types/contracts.ts`, `useUserRole.ts`, `ImportarVisitasDialog.tsx`, `Contratos.tsx`, `ContratoDetailDialog.tsx`, `NovoContratoDialog.tsx`, `Arquivo.tsx`, `lib/currency.ts`.

Vou executar em duas fases: **(A)** migração (aguarda aprovação), **(B)** código frontend após aprovação dos types regenerados.
