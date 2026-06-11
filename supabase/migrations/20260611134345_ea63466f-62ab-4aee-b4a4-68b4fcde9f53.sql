
-- Flag de contrato especial (faturamento parcial)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS contrato_especial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_total_contrato numeric;

-- Tabela auditável de faturamentos parciais
CREATE TABLE IF NOT EXISTS public.faturamentos_parciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  valor numeric NOT NULL CHECK (valor > 0),
  descricao text NOT NULL DEFAULT '',
  data_faturamento date NOT NULL DEFAULT (now()::date),
  numero_nota text NOT NULL DEFAULT '',
  criado_por uuid,
  criado_por_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faturamentos_parciais TO authenticated;
GRANT ALL ON public.faturamentos_parciais TO service_role;

ALTER TABLE public.faturamentos_parciais ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fat_parciais_contrato ON public.faturamentos_parciais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_fat_parciais_data ON public.faturamentos_parciais(data_faturamento DESC);

-- Leitura: quem pode ler o contrato pode ler seus faturamentos
CREATE POLICY "Read faturamentos by contrato access"
  ON public.faturamentos_parciais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contratos c
      WHERE c.id = contrato_id
        AND c.deleted_at IS NULL
        AND (
          public.is_admin(auth.uid())
          OR public.is_backoffice(auth.uid())
          OR public.is_coordenador(auth.uid())
          OR public.has_role(auth.uid(), 'operador'::public.app_role)
          OR public.has_role(auth.uid(), 'secretaria'::public.app_role)
          OR public.has_role(auth.uid(), 'interlocutora'::public.app_role)
          OR (public.is_vendedor(auth.uid()) AND c.agente_pj_id = public.responsavel_id_of(auth.uid()))
        )
    )
  );

-- Insert/Update/Delete: somente quem pode editar o contrato (admin, backoffice, coordenador, financeiro)
CREATE POLICY "Insert faturamentos by contrato edit"
  ON public.faturamentos_parciais FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_contrato(auth.uid(), contrato_id)
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'interlocutora'::public.app_role)
  );

CREATE POLICY "Update faturamentos by contrato edit"
  ON public.faturamentos_parciais FOR UPDATE
  TO authenticated
  USING (
    public.can_edit_contrato(auth.uid(), contrato_id)
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'interlocutora'::public.app_role)
  )
  WITH CHECK (
    public.can_edit_contrato(auth.uid(), contrato_id)
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'interlocutora'::public.app_role)
  );

CREATE POLICY "Delete faturamentos by admin/coord"
  ON public.faturamentos_parciais FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_coordenador(auth.uid())
  );

CREATE TRIGGER trg_fat_parciais_updated_at
  BEFORE UPDATE ON public.faturamentos_parciais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reaproveita bump_ultima_movimentacao para faturamentos (campo uploader/autor não existe; usa criado_por_nome)
CREATE OR REPLACE FUNCTION public.bump_mov_faturamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contratos
    SET ultima_movimentacao_at = now(),
        ultima_movimentacao_por = COALESCE(NEW.criado_por_nome, '')
    WHERE id = NEW.contrato_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_bump_mov_faturamento
  AFTER INSERT ON public.faturamentos_parciais
  FOR EACH ROW EXECUTE FUNCTION public.bump_mov_faturamento();

-- Log no histórico do contrato
CREATE OR REPLACE FUNCTION public.log_faturamento_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contratos_historico(contrato_id, campo, valor_anterior, valor_novo, usuario_nome, usuario_funcao)
    VALUES (NEW.contrato_id, 'faturamento_parcial',
            NULL,
            'R$ ' || to_char(NEW.valor, 'FM999G999G990D00') || COALESCE(' — ' || NULLIF(NEW.descricao, ''), ''),
            NEW.criado_por_nome, 'faturamento');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.contratos_historico(contrato_id, campo, valor_anterior, valor_novo, usuario_nome, usuario_funcao)
    VALUES (OLD.contrato_id, 'faturamento_parcial',
            'R$ ' || to_char(OLD.valor, 'FM999G999G990D00'),
            NULL,
            OLD.criado_por_nome, 'faturamento');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER tg_log_faturamento_change
  AFTER INSERT OR DELETE ON public.faturamentos_parciais
  FOR EACH ROW EXECUTE FUNCTION public.log_faturamento_change();
