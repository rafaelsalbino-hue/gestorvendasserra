
# Plano de entrega — Gestão RPC Serra

Escopo grande (8 features + G1, G2, G3, G4, G5, G6). Para evitar uma única entrega frágil, vou dividir em **4 rodadas** sequenciais, cada uma fechada e testável. Você aprova esta rodada 1 e seguimos.

---

## Rodada 1 — Novos campos nas etapas + uploads (itens 1, 2, 7 + G4)

### Banco
- `contratos`: adicionar colunas
  - `instrutor` (text)
  - `dias_execucao` (text[])  — valores: `segunda…domingo`
  - `horario_inicio` (time), `horario_fim` (time)
- Novo bucket `contratos-arquivos` (privado) — reutiliza padrão de `contratos-anexos`, mas com **categoria** para distinguir tipos.
- Nova tabela `contrato_arquivos`:
  - `contrato_id`, `categoria` (`chamado_faturamento` | `planilha_alunos`), `storage_path`, `file_name`, `file_size`, `mime_type`, `uploaded_by`, `uploader_nome`, `created_at`
  - RLS igual a `contrato_anexos` (read autenticado; insert pelo próprio uploader; delete uploader/gestor; backoffice via role já existente).
- Trigger de histórico: registrar inserção/remoção de arquivo em `contratos_historico` (G1 parcial).

### Frontend
- `NovoContratoDialog` / `ContratoDetailDialog` (seção "RPC / Execução"):
  - Input "Instrutor" (texto).
  - Chips multi-select para dias da semana (Seg…Dom) com toggle.
  - Dois inputs `type="time"` (início / fim) com validação fim > início.
- Seção "Faturamento":
  - Upload "Chamado de Faturamento" (PDF, JPG, PNG, DOC, DOCX) usando hook reutilizável `useContratoArquivos`.
  - Mostra nome, tamanho, link assinado; botão "Substituir" e "Remover".
- Seção "Matrícula / Dados":
  - Upload múltiplo "Planilha de Alunos da Turma" (XLSX, XLS, CSV), lista com nome + data de envio + remover/substituir.
- Todos os uploads: spinner durante envio + toast de sucesso/erro (G4).

---

## Rodada 2 — Cargo + Valor + Permissões (itens 4, 5, 6 + G5)

- Enum `funcao_responsavel`: adicionar `Coordenador SESI/SENAI` (mantém os existentes).
- `Valor`: máscara `R$ 1.234,56` no input (helper `formatBRL`/`parseBRL`); badge destacado em listagens (Kanban + Arquivo).
- Permissões de status: **Secretaria** e **Interlocutora de Faturamento** podem alterar qualquer campo `status_*`. UI libera selects; RLS já permite UPDATE para todos autenticados, então o controle vira frontend + histórico obrigatório.
- Revisão rápida da matriz de perfis (G5): documento curto em `mem://features/permissoes.md` + bloqueio de campos sensíveis (valor, cliente, CNPJ) para perfis sem papel gestor/backoffice.

---

## Rodada 3 — Arquivo: busca, ordenação, export + G1/G2 (itens 3 + G1 + G2)

- Página `Arquivo.tsx`:
  - Search bar global (cliente, CNPJ, nº RPC, serviço).
  - Filtros: período (date range), status, responsável, serviço, entidade.
  - Sort por coluna (data, status, responsável, valor).
  - Botões "Exportar XLSX" e "Exportar PDF" da lista filtrada (reusa `src/lib/export.ts`).
- G1: ampliar gravação em `contratos_historico` para uploads, deletes e mudanças de status (trigger genérica em `contratos` + chamadas explícitas nos hooks de arquivo/comentário).
- G2: hook `useEtapaValidation` que impede avançar etapa sem campos obrigatórios da etapa atual (mensagens claras por campo).

---

## Rodada 4 — Importação de visitas + Notificações (item 8 + G6 + G3)

- Botão "Importar Visitas" no header de `Contratos`:
  - Modal com 2 ações: **Baixar modelo** (gera XLSX no cliente via `xlsx` lib) e **Upload**.
  - Parser client-side → tabela de prévia com validação linha a linha (campos obrigatórios, CNPJ válido, data válida, unidade ∈ {SESI, SENAI, SESI Saúde}).
  - Detecção de duplicata (CNPJ + data) → marca linha como "ignorada" com aviso, **não importa** (escolha confirmada).
  - Botão "Confirmar importação" faz insert em lote.
- G6 — Notificações: tabela `notificacoes` (user_id, contrato_id, tipo, lida_at) + sino no header com contador. Trigger em mudança de `etapa_atual` ou `status_*` notifica responsáveis vinculados.
- G3 — Passe de responsividade: tabelas com scroll horizontal, chips de dias em grid 2 colunas no mobile, dialogs com `max-h-[90vh] overflow-auto`.

---

## Detalhes técnicos comuns

- Hooks: `useContratoArquivos(contratoId, categoria)` espelha `useContratoAnexos`, isolando upload/list/delete/signedUrl.
- Storage: bucket único `contratos-arquivos` privado; path = `{contrato_id}/{categoria}/{uuid}_{filename}`.
- Tipos: estender `Contrato` em `src/types/contracts.ts` com novos campos opcionais para não quebrar telas existentes.
- Histórico: novo helper `logContratoChange({contratoId, campo, valor_anterior, valor_novo})` chamado dos hooks de mutação.
- Sem alterações em telas/fluxos não citados.

---

## O que precisamos confirmar antes de começar a Rodada 1

1. **Bucket único `contratos-arquivos`** (chamado + planilha + futuros) está OK, ou prefere bucket separado por categoria?
2. **Dias da semana** — guardar como `text[]` (`['segunda','quarta']`) ou bitmask? Recomendo `text[]` por legibilidade.
3. Confirma seguir agora **apenas com a Rodada 1** e depois encadear Rodada 2 → 3 → 4 em mensagens separadas?
