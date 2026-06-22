import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, FileLock2, Users, Mail } from "lucide-react";

export default function Seguranca() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Segurança e Privacidade</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Esta página é mantida pela equipe do Gestor de Vendas Serra (FIESC) para
            esclarecer dúvidas comuns sobre segurança, privacidade e tratamento de
            dados no sistema. Não é uma certificação independente — descreve os
            controles atualmente ativos no aplicativo.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Acesso e autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>O acesso é restrito a colaboradores com e-mail corporativo dos domínios
            autorizados (FIESC, SESI/SC e SENAI/SC). Cadastros fora desses domínios são
            bloqueados automaticamente.</p>
            <p>As permissões são definidas por cargo e por etapa do processo, e podem ser
            ajustadas por administradores na tela de Responsáveis.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileLock2 className="h-4 w-4" /> Dados e armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Dados de contratos e arquivos anexos são armazenados em backend gerenciado
            (Lovable Cloud / Supabase) com Row-Level Security ativa em todas as tabelas.</p>
            <p>O download de anexos exige que o usuário tenha permissão de leitura no
            contrato correspondente — não é possível baixar arquivos de contratos aos
            quais o usuário não tem acesso.</p>
            <p>Senhas nunca são armazenadas em texto puro; a autenticação é gerenciada
            pelo provedor de identidade.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Integrações
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Notificações de avanço de etapa podem ser enviadas via WhatsApp (Z-API)
            para os responsáveis cadastrados na etapa. As credenciais da integração ficam
            armazenadas como segredos no backend e nunca são expostas ao navegador.</p>
            <p>O conteúdo das mensagens enviadas pode ser auditado em
            "Notificações WhatsApp" dentro de cada contrato.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Para reportar um problema de segurança ou solicitar revisão de acessos,
            procure o administrador do sistema na sua unidade FIESC.
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Sistema de uso interno FIESC Serra Catarinense — não destinado ao público externo.
        </p>
      </div>
    </div>
  );
}