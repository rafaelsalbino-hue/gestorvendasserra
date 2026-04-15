
-- Add new roles to the enum
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Gerente Regional';
ALTER TYPE public.funcao_responsavel ADD VALUE IF NOT EXISTS 'Interlocutora de Faturamento';

-- Create the missing trigger for handle_new_user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
