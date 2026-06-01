# Rodada 6 — UI/UX + Funcionalidades

Escopo grande. Vou dividir em 6 frentes, implementando em ordem de impacto e dependência. Cada frente é independente o suficiente para ser testada isoladamente.

## 1. Sidebar Recolhível
- Substituir `AppSidebar.tsx` para suportar dois estados (expandido 200px / recolhido 52px)
- Persistir estado em `localStorage` (`sidebar:collapsed`)
- Tooltips nos ícones quando recolhido
- Grupos "Principal" / "Gestão" com separador
- Badge de pendências em "Visitas" (consulta visitas da semana sem confirmação)
- Borda esquerda azul (#4DA3FF) no item ativo
- Botão de recolher/expandir no rodapé (seta ‹ / ›)
- Mobile (<768px): mantém comportamento drawer (já existe via `offcanvas`)

## 2. Kanban — Status Proposta CRM nos cards
- Em `Contratos.tsx` cards: linha "Status CRM" abaixo do cliente, antes do valor
- Badge com ponto colorido + texto, cores semânticas
- Inline edit via `DropdownMenu` ao clicar no badge (mutate via hook existente)
- Filtro independente já existe; garantir que não interfere com filtro de etapa

## 3. Campo Valor — Redesign
- `NovoContratoDialog` / edição: input com máscara BRL (já temos `formatBRLInput`) — confirmar uso e label "Valor total da proposta (R$)"
- `ContratoDetailDialog`: bloco de destaque azul claro com valor grande
- Garantir formatação em listagens
- Cálculo "por aluno estimado" quando houver nº de alunos

## 4. SESI Educação — Contraturno / ACE
- Estender `unit_subdivisions` (seed) com Contraturno e ACE para "SESI Educação"
- Frontend: filtro dinâmico já existe; garantir que aparece nas opções
- Modelo XLSX de importação: dropdown com novas opções
- Validação da importação aceitar Contraturno e ACE

## 5. Backoffice finaliza processo
- Atualizar `permissions.ts` → `canFinalizarContrato` incluir `backoffice`
- Atualizar RLS via migration: `can_edit_contrato` já cobre backoffice em não-finalizados; precisamos permitir backoffice **finalizar**. Como finalizar é UPDATE em `finalized_at`, e a policy de update usa `can_edit_contrato`, basta garantir lógica
- Modal de confirmação já existe; mostrar botão para backoffice

## 6. Melhorias visuais gerais
### 6.1 Topbar
- Breadcrumb dinâmico baseado na rota
- Sino de notificações (já existe) + contador (já existe)
- Busca global ⌘K (já existe via `GlobalSearch`) — adicionar shortcut listener
- Mostrar cargo do usuário ao lado do avatar

### 6.2 Cards
- Tag por entidade com cores
- Iniciais dos responsáveis
- Barra de progresso 1–6 na base
- Datas relativas (`date-fns` `formatDistanceToNow` em pt-BR)

### 6.3 Formulários
- Auto-format CNPJ e telefone (já temos lib cnpj)
- Asterisco em obrigatórios + foco azul
- Validação inline

### 6.4 Dashboard
- Mini gráficos por entidade (recharts)
- Barra de meta mensal
- Badge "parado há +7 dias"
- Quick actions por perfil

## Gaps
- G1 Dark/light: usar tokens semânticos (sem hex hardcoded em componentes novos — adicionar tokens em `index.css`)
- G2 Empty states amigáveis em Kanban e listagens
- G3 Skeleton loaders em Kanban/listagem (já existe `Skeleton`)
- G4 a11y: aria-label, focus ring, contraste

## Ordem de execução
1. Tokens de cor + sidebar recolhível (base visual)
2. Kanban (cards com CRM, entidade tag, progresso, datas relativas, inline edit CRM)
3. Detalhe do contrato (bloco valor + permissão backoffice finalizar)
4. Migration Contraturno/ACE + importação XLSX
5. Topbar (breadcrumb, ⌘K, cargo)
6. Dashboard (gráficos, meta, badges)
7. Empty states + skeletons + a11y pass

## Riscos
- Esta é uma rodada grande. Vou tentar manter cada arquivo focado e não quebrar nada existente. Se algum item ficar parcial, deixo nota explícita no fim.