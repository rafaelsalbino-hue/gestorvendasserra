# Onda 4 + Diagnóstico Z-API

Duas frentes na mesma rodada.

## Frente A — Debug Z-API (mensagens não chegam)

Hoje `enviar-whatsapp` grava `status='enviado'` sempre que HTTP=200, mas a Z-API retorna 200 mesmo quando não enfileira a mensagem (sem `zaapId`). Por isso o app diz "enviado" e nada chega.

Mudanças na função `supabase/functions/enviar-whatsapp/index.ts`:

1. **Check de secrets no topo** com preview mascarado dos 3 (ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN). Retorna 500 se faltar algum.
2. **Logs completos por destinatário** antes do envio: status HTTP, body bruto, telefone formatado, preview da mensagem.
3. **Sucesso real = HTTP 200 + `zaapId` presente.** Sem `zaapId` → grava `status='falhou'`, erro inclui o body retornado pela Z-API.
4. **`formatPhoneBR` estrito**: remove não-dígitos, prefixa `55`, insere o `9` quando vier com 12 dígitos (celular BR), valida 12–13 dígitos, retorna `null` se inválido. Substitui o `onlyDigits`+`ensureDdi55` atual.
5. **Endpoint GET `?action=status`**: chama `https://api.z-api.io/instances/{id}/token/{tok}/status` com `Client-Token` e devolve `{ instanceStatus, smartphoneConnected, secretsLoaded }`. Sem auth (mantém `verify_jwt=false`).
6. **Retorno enriquecido**: por destinatário devolve `{ numero, nome, status, zaapId?, erro? }` para o frontend exibir.

Frontend:

- `src/lib/whatsappNotify.ts`: deixa de ser totalmente silencioso. Após cada `invoke`, conta `enviados` / `falhou` / `duplicado` e dispara `toast.success` ou `toast.error` com resumo "X enviados, Y falharam" (link "ver detalhes" abre console). Mantém try/catch para nunca quebrar fluxo.
- Novo botão **"Diagnosticar Z-API"** no topo da página `/responsaveis` (só para admin/gestor): chama o GET `?action=status` via `supabase.functions.invoke('enviar-whatsapp', { method: 'GET' })`, abre `Dialog` mostrando: status da instância, smartphoneConnected, e check (✅/❌) de cada secret carregado.

## Frente B — Matriz admin de permissões por etapa

Hoje as permissões estão hard-coded em `src/lib/permissions.ts` + funções SQL. O admin precisa ligar/desligar cargos por etapa sem nova deploy.

**Modelo (granular como sugerido):** uma linha por (etapa, função) com 3 flags `pode_criar`, `pode_editar`, `pode_avancar`. Cobre os 3 verbos sem explodir em tabelas separadas.

Nova migration:

```sql
CREATE TABLE public.etapa_cargo_permissoes (
  id uuid PK,
  etapa etapa_contrato NOT NULL,
  funcao funcao_responsavel NOT NULL,
  pode_criar boolean DEFAULT false,
  pode_editar boolean DEFAULT false,
  pode_avancar boolean DEFAULT false,
  UNIQUE(etapa, funcao)
);
```

- GRANT padrão + `service_role` + `anon` negado.
- RLS: SELECT para `authenticated`; INSERT/UPDATE/DELETE só para `is_admin(auth.uid())`.
- Seed: replica permissões atuais (todos supervisores+coordenadores com `pode_criar/editar/avancar` em `visita` e `supervisor`; backoffice em rpc/execucao; secretaria em matricula; PCP em ensalamento; financeiro em faturamento; agente PJ em visita/proposta).

Funções SQL:

- `public.pode_lancar_etapa(_user_id uuid, _etapa etapa_contrato, _acao text)` — consulta a matriz pela `funcao` do usuário em `responsaveis`. SECURITY DEFINER.
- `can_edit_contrato` atualizada: admin/gestor/backoffice/agente-dono continuam liberados (compatibilidade); demais usam `pode_lancar_etapa(uid, etapa_atual, 'editar')`. Mantém `is_supervisor` como atalho.

Frontend:

- `src/hooks/usePermissoesEtapa.ts` — query + mutations (toggle flag).
- `src/lib/permissions.ts` — `canCreateVisita` e `canEditContrato` passam a aceitar matriz (carregada em `useUserRole`); fallback para regras atuais se matriz vazia.
- Nova aba **"Permissões"** dentro de `/responsaveis` (segmento ao lado da lista): grid Cargos (linhas, todas as `FUNCOES_RESPONSAVEL`) × Etapas (colunas, as 8 do pipeline). Cada célula é um `Popover` com 3 `Switch` (criar/editar/avançar). Header mostra contagem "X cargos ativos nesta etapa". Só admin/gestor vê e edita.
- Toast confirma cada alteração; mutation invalida cache.

## Plano de execução

1. Migration matriz (Frente B SQL) → aguarda aprovação.
2. Após approve: edge function `enviar-whatsapp` reescrita + `whatsappNotify.ts` + botão diagnóstico (Frente A completa).
3. Hook `usePermissoesEtapa` + `permissions.ts` atualizado + aba Permissões em `/responsaveis` (Frente B UI).
4. Smoke test: envio WhatsApp (verifica zaapId nos logs), toggle de permissão (cargo desligado perde botão de editar).

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (matriz + seed + função `pode_lancar_etapa` + update `can_edit_contrato`)
- `supabase/functions/enviar-whatsapp/index.ts` (reescrita)
- `src/lib/whatsappNotify.ts` (toast com resumo)
- `src/hooks/usePermissoesEtapa.ts` (novo)
- `src/hooks/useUserRole.ts` (expor matriz se necessário)
- `src/lib/permissions.ts` (consulta matriz)
- `src/pages/Responsaveis.tsx` (botão diagnóstico + aba Permissões)
- `src/components/DiagnosticoZapiDialog.tsx` (novo)
- `src/components/MatrizPermissoesEtapas.tsx` (novo)
