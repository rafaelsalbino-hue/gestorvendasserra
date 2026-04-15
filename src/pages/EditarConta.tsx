import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { supabase } from "@/integrations/supabase/client";

const EditarConta = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState(currentUser?.nome || "");
  const [email, setEmail] = useState(user?.email || "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Update name in responsaveis table
      if (currentUser && nome !== currentUser.nome) {
        const { error } = await supabase
          .from("responsaveis")
          .update({ nome })
          .eq("id", currentUser.id);
        if (error) throw error;
      }

      // Update email in auth
      if (email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        toast({ title: "E-mail atualizado", description: "Verifique seu novo e-mail para confirmar a alteração." });
      }

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao atualizar perfil", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!senha || senha.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (senha !== confirmarSenha) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setSenha("");
      setConfirmarSenha("");
      toast({ title: "Senha alterada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao alterar senha", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Editar Conta</h1>
          <p className="text-muted-foreground text-sm">Atualize seus dados pessoais e senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
            <CardDescription>Altere seu nome ou e-mail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Input value={currentUser?.funcao || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">A função não pode ser alterada por aqui.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Dados
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alterar Senha</CardTitle>
            <CardDescription>Defina uma nova senha para sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input type="password" placeholder="Repita a nova senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default EditarConta;
