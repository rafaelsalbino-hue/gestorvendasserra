import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FUNCOES_RESPONSAVEL, FUNCOES_GESTOR, ALLOWED_DOMAINS, type FuncaoResponsavel } from "@/types/contracts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import logoSesi from "@/assets/logo-sesi.png";
import logoSenai from "@/assets/logo-senai.png";
import logoTratativa from "@/assets/logo-tratativa.jpg";

const Auth = () => {
  useDocumentTitle("Entrar");
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupNome, setSignupNome] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFuncao, setSignupFuncao] = useState<FuncaoResponsavel | "">("");

  // Segurança: papéis privilegiados não podem ser auto-atribuídos no cadastro público.
  // A promoção é feita manualmente por um gestor após o cadastro.
  const SIGNUP_FUNCOES = FUNCOES_RESPONSAVEL.filter((f) => !FUNCOES_GESTOR.includes(f));

  const validateDomain = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: "Login realizado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro no login", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupEmail || !signupPassword || !signupNome || !signupFuncao) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (!validateDomain(signupEmail)) {
      toast({
        title: "Domínio não permitido",
        description: `Apenas e-mails dos domínios ${ALLOWED_DOMAINS.join(", ")} são aceitos.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupNome, signupFuncao);
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." });
    } catch (e: any) {
      toast({ title: "Erro ao criar conta", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={logoTratativa} alt="TratAtiva" className="h-28 w-auto object-contain" />
          </div>
          <div className="flex justify-center items-center gap-4 opacity-80">
            <img src={logoSesi} alt="SESI" className="h-7 w-auto object-contain" />
            <img src={logoSenai} alt="SENAI" className="h-7 w-auto object-contain" />
          </div>
          <CardTitle className="text-xl">TratAtiva</CardTitle>
          <CardDescription>Gestão Comercial — FIESC Serra Catarinense</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Criar Conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={async () => {
                    if (!loginEmail) {
                      toast({ title: "Digite seu e-mail para recuperar a senha", variant: "destructive" });
                      return;
                    }
                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
                    } catch (e: any) {
                      toast({ title: "Erro", description: e.message, variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input placeholder="Seu nome" value={signupNome} onChange={(e) => setSignupNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="seu@empresa.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">Domínios aceitos: {ALLOWED_DOMAINS.join(", ")}</p>
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={signupFuncao} onValueChange={(v) => setSignupFuncao(v as FuncaoResponsavel)}>
                  <SelectTrigger><SelectValue placeholder="Selecione sua função" /></SelectTrigger>
                  <SelectContent>
                    {SIGNUP_FUNCOES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Funções de gestão (Coordenador de Mercado, Analista Comercial) são atribuídas posteriormente por um administrador.
                </p>
              </div>
              <Button className="w-full" onClick={handleSignup} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Conta
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
