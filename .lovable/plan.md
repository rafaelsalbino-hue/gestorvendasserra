## Objetivo

Quando alguém adicionar um comentário em um contrato, disparar notificação **WhatsApp** para os **Backoffices ativos da entidade do contrato** (SESI Educação → Backoffice SESI Educação; SENAI → Backoffice SENAI; SESI Saúde → Backoffice SESI Saúde; REDE → Backoffice REDE). Se o próprio autor do comentário for Backoffice, ele é excluído do envio.

Escopo: **todas as etapas**. Canal: **somente WhatsApp** (sem tocar em `notificacoes` in-app).

## Como funciona hoje (verificado)

- Comentários são inseridos por `useAddComentario` (`src/hooks/useContratoComentarios.ts`), que já grava `autor_id`, `autor_nome`, `autor_funcao` em `contrato_comentarios`.
- Um trigger `reset_proposta_sla_on_comment` já atualiza o SLA ao inserir comentário.
- A edge function `enviar-whatsapp` já sabe montar mensagens por etapa/entidade, mas hoje é chamada apenas em mudança de etapa (`notifyEtapaWhatsapp` em `src/lib/whatsappNotify.ts`), consultando `notificacao_permissoes` por etapa.

## Mudanças

### 1. Edge function `enviar-whatsapp` (novo modo `comentario`)

Adicionar suporte a um payload alternativo:

```jsonc
{
  "tipo": "comentario",
  "contrato_id": "...",
  "autor_id": "<uuid do autor do comentário>",
  "autor_nome": "...",
  "texto": "<preview do comentário>"
}
```

Comportamento quando `tipo === "comentario"`:

- Buscar o contrato (para obter `entidade`, `cliente`, `etapa_atual`, número do processo/link).
- Selecionar destinatários em `responsaveis` onde:
  - `ativo = true` e `telefone` preenchido;
  - `funcao` corresponde ao Backoffice da entidade do contrato:
    - `SESI` / `SESI Educação` → `Backoffice SESI Educação`
    - `SENAI` → `Backoffice SENAI`
    - `SESI Saúde` → `Backoffice SESI Saúde`
    - `REDE` → `Backoffice REDE`
  - `user_id <> autor_id` (exclui o autor do comentário).
- Respeitar turno atual (reutilizar helper existente) — mensagens fora do turno vão para a fila `notificacoes_whatsapp` como já ocorre hoje.
- Não consultar `notificacao_permissoes` neste fluxo (regra é fixa: sempre notificar Backoffice da entidade em qualquer etapa).
- Reaproveitar deduplicação/log já existentes; `template = "comentario"` para permitir análise no dashboard de e-mails/WhatsApp.

Mensagem sugerida:

```
🗒️ Novo comentário no contrato
Cliente: {cliente}
Etapa: {etapa_atual}
Autor: {autor_nome}

"{texto (até ~240 chars)}"

Abrir contrato: {link}
```

### 2. Front-end — disparar após inserir comentário

Em `src/hooks/useContratoComentarios.ts`, dentro de `useAddComentario.onSuccess` (fire-and-forget, silencioso, não bloqueia UI):

- Chamar `supabase.functions.invoke("enviar-whatsapp", { body: { tipo: "comentario", contrato_id, autor_id: user.id, autor_nome, texto } })`.
- Pular quando `is_system === true` (comentários automáticos do sistema não devem notificar).
- Erros só em `console.warn`; toasts existentes ficam iguais.

Isso cobre tanto o campo "Observações" do Resumo quanto qualquer outra origem que use o hook.

### 3. Sem alteração de schema

Não é necessário criar tabela nem alterar `notificacao_permissoes`. A regra é fixa por entidade e etapa "todas". Se no futuro o usuário quiser tornar configurável, adicionamos um canal `comentario` na matriz — fora do escopo agora.

## Detalhes técnicos

- Entidade → função Backoffice: mapeamento hardcoded na edge function, espelhando o já existente para outras funções.
- Exclusão do autor: comparar `responsaveis.user_id` com `autor_id` recebido no payload.
- Preview do texto: cortar em ~240 chars com reticências para caber bem no WhatsApp.
- Link: reutilizar montagem de URL já usada no fluxo de etapa (base do site + `?contrato=<id>`).
- Deduplicação: chave `comentario:<comentario_id>` opcional; sem ID do comentário disponível na chamada, usar `contrato_id + autor_id + hash(texto)` numa janela curta (10 min) para evitar duplicatas por retry.

## Arquivos afetados

- `supabase/functions/enviar-whatsapp/index.ts` — novo branch `tipo === "comentario"`.
- `src/hooks/useContratoComentarios.ts` — invocar edge function em `onSuccess`, ignorando comentários do sistema.

## Validação

1. Adicionar comentário como usuário não-Backoffice em contrato SESI Educação → Backoffices SESI Educação ativos recebem WhatsApp; autor não recebe nada.
2. Adicionar comentário como Backoffice SESI Educação → nenhum WhatsApp enviado (ele é o autor e é o único perfil elegível).
3. Adicionar comentário em contrato SENAI → apenas Backoffice SENAI recebe.
4. Comentário do sistema (`is_system=true`) → nenhum WhatsApp.
5. Fora do turno → mensagem entra em `notificacoes_whatsapp` e é enviada pelo processador de fila.
