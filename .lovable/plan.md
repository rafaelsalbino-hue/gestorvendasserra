## Onda 3 — Melhoria 4 + Expansão de Permissões

### Parte A — Expansão de permissões (novo, pedido nesta rodada)

**Objetivo:** Coordenadores e Supervisores também podem (1) criar visitas e (2) editar/avançar contratos na etapa "Supervisor".

**Banco**
- Nova função `public.is_supervisor(_user_id uuid)` (SECURITY DEFINER) — retorna `true` se o responsável vinculado ao user tem `funcao` começando com `'Supervisor'`.
- Atualizar `public.can_edit_contrato`: permitir quando `is_supervisor(uid)` E `etapa_atual = 'supervisor'` (ou o supervisor for o `agente_pj_id`? — apenas por etapa, sem restrição extra, conforme pedido).
- Política RLS de INSERT em `contratos` já é aberta para autenticados — sem mudança.

**Frontend**
- `useUserRole`: expor `isSupervisor` (via query em `responsaveis.funcao` do user logado — usa `responsavel_id_of` ou join simples).
- `permissions.ts`:
  - `canCreateVisita`: incluir `isSupervisor`.
  - `canEditContrato`: quando contrato.etapa_atual === 'supervisor', permitir supervisor.
  - `canMoverStatus`: já amplo, sem mudança.

### Parte B — Melhoria 4 (escopo original)

**B1. Campo `acao_esperada` em `contratos`**
- Migration: `ALTER TABLE contratos ADD COLUMN acao_esperada text;`
- Atualizado automaticamente por trigger conforme a etapa atual + status, descrevendo "o que se espera agora" (ex.: "Aguardando proposta do Agente PJ", "Aguardando aprovação do Supervisor", "Aguardando emissão de RPC").
- Mostrado no `ContratoDetailDialog` (card destacado azul #003DA5) e nas linhas da tabela em `Contratos.tsx`.

**B2. Automação Visita → Proposta**
- Trigger: ao mudar `dados_proposta` para `'Dados entregues'` em uma visita (etapa_atual='visita'), avançar automaticamente para `etapa_atual='proposta'` e disparar notificação WhatsApp.

**B3. Blocos internos "Status RPC" e "Ensalamento"**
- Reorganizar `ContratoDetailDialog`: dentro da etapa **RPC/Execução** mostrar bloco "Status RPC" (status_rpc + numero_rpc + info_execucao); dentro de **Ensalamento** mostrar bloco "Ensalamento" (ensalamento_pcp + abertura_chamado + numero_chamado).
- Sem alterar nomes ou quantidade das 8 etapas.

**B4. Template WhatsApp expandido**
- Atualizar `enviar-whatsapp/index.ts` para incluir no corpo da mensagem: nome do cliente, etapa anterior → nova etapa, `acao_esperada` calculada, link direto do contrato. Origem (manual/automático) já é registrada.

### Arquivos esperados
- 1 migration SQL (is_supervisor, can_edit_contrato, acao_esperada coluna+trigger, trigger visita→proposta)
- `src/hooks/useUserRole.ts`, `src/lib/permissions.ts`
- `src/components/ContratoDetailDialog.tsx` (blocos + card acao_esperada)
- `src/pages/Contratos.tsx` (coluna/badge acao_esperada — opcional, leve)
- `supabase/functions/enviar-whatsapp/index.ts` (template)

### Confirmações antes de executar
1. **Supervisor edita contrato em qualquer etapa "supervisor", ou só os contratos do seu segmento (SESI/SENAI/Saúde)?** — proponho **qualquer contrato na etapa supervisor**, sem filtro por entidade, para casar com o pedido literal. Posso refinar depois.
2. **`acao_esperada` calculada por trigger no banco (sempre consistente)** ou **derivada no frontend (mais flexível)**? — proponho **trigger no banco** para garantir consistência com notificações WhatsApp.