## Plano

1. **Trocar o destino do campo Observações no resumo do contrato**
   - Manter o campo visual no mesmo lugar do modal de detalhes.
   - Ao clicar em **Salvar**, inserir o texto em `contrato_comentarios` em vez de atualizar colunas `observacoes_*` da tabela de contratos.
   - Usar o autor logado já disponível no sistema (`currentUser`) para registrar nome e função.

2. **Resetar o SLA ao salvar a observação como comentário**
   - Após criar o comentário, atualizar `etapa_updated_at` do contrato para o horário atual.
   - Manter o feedback visual: toast informando que a observação foi registrada nos comentários e que o SLA foi reiniciado.

3. **Atualizar a tela após salvar**
   - Limpar o campo de Observações depois do salvamento.
   - Invalidar/refrescar as queries de `contrato_comentarios`, `contratos` e `contrato-detail`, para que o comentário apareça na aba **Histórico** / comentários sem depender de recarregar a página.

4. **Remover o caminho que causava o erro**
   - O botão do resumo não enviará mais payload com `observacoes` nem dependerá das colunas de observação do contrato.
   - Assim, o erro de schema cache relacionado a `observacoes` deixa de ocorrer nesse fluxo.

## Arquivos previstos

- `src/components/contrato-detail/ContratoDetailResumo.tsx`
- Possível ajuste pequeno em `src/hooks/useContratoComentarios.ts`, caso seja necessário reutilizar melhor a mutação de comentários no resumo.