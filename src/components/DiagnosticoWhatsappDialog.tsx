import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ETAPAS = [
  "visita", "crm", "supervisor", "proposta", "rpc", "execucao",
  "matricula", "ensalamento", "faturamento", "finalizado",
] as const;

type ContratoLite = { id: string; cliente: string; entidade: string | null };
type NotifLog = {
  id: string; created_at: string; destinatario_nome: string | null;
  numero_destinatario: string | null; etapa_destino: string | null;
  status: string | null; erro: string | null;
};
type Responsavel = { nome: string; funcao: string; whatsapp: string | null; ativo: boolean };

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  const v = status === "enviado" ? "default" : status === "duplicado" ? "secondary" : "destructive";
  return <Badge variant={v as any}>{status}</Badge>;
}

export function DiagnosticoWhatsappDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [contratos, setContratos] = useState<ContratoLite[]>([]);
  const [filtro, setFiltro] = useState("");
  const [contratoId, setContratoId] = useState<string>("");
  const [etapa, setEtapa] = useState<string>("rpc");
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<any>(null);
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [backoffices, setBackoffices] = useState<Responsavel[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const carregarContratos = async () => {
    const { data } = await supabase
      .from("contratos")
      .select("id, cliente, entidade")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    setContratos((data ?? []) as ContratoLite[]);
  };

  const carregarLogs = async () => {
    const { data } = await supabase
      .from("notificacoes_whatsapp" as any)
      .select("id, created_at, destinatario_nome, numero_destinatario, etapa_destino, status, erro")
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs((data ?? []) as unknown as NotifLog[]);
  };

  const carregarBackoffices = async () => {
    const { data } = await supabase
      .from("responsaveis")
      .select("nome, funcao, whatsapp, ativo")
      .order("funcao");
    // `funcao` é enum no banco: LIKE/ILIKE quebra a query (sem operador ~~ para enum).
    const backs = (data ?? []).filter((r: any) => String(r?.funcao ?? "").startsWith("Backoffice"));
    setBackoffices(backs as unknown as Responsavel[]);
  };

  const carregarHealth = async () => {
    setLoadingHealth(true);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { action: "health_check" },
      });
      if (error) throw error;
      setHealth(data);
    } catch (err: any) {
      toast.error("Falha no health check", { description: String(err?.message ?? err) });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarContratos();
      carregarLogs();
      carregarBackoffices();
      carregarHealth();
    }
  }, [open]);

  const contratosFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return contratos.slice(0, 50);
    return contratos.filter((c) => c.cliente?.toLowerCase().includes(q)).slice(0, 50);
  }, [contratos, filtro]);

  const testar = async () => {
    if (!contratoId || !etapa) {
      toast.error("Selecione contrato e etapa.");
      return;
    }
    setEnviando(true);
    setResposta(null);
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: {
          contrato_id: contratoId,
          etapa_destino: etapa,
          usuario_atual_nome: "Diagnóstico Admin",
          origem: "manual",
        },
      });
      if (error) {
        setResposta({ error: error.message, details: (error as any) });
      } else {
        setResposta(data);
      }
      await carregarLogs();
    } catch (err: any) {
      setResposta({ error: String(err?.message ?? err) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Diagnóstico WhatsApp</DialogTitle>
          <DialogDescription>
            Painel administrativo para testar o envio de notificações WhatsApp e inspecionar a configuração.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="teste" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="teste">Teste de Envio</TabsTrigger>
            <TabsTrigger value="logs">Últimas Notificações</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="backoffice">Backoffices</TabsTrigger>
          </TabsList>

          <TabsContent value="teste" className="space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Buscar contrato (cliente)</Label>
                <Input
                  placeholder="Digite o nome do cliente"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
                <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {contratosFiltrados.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.cliente} {c.entidade ? `— ${c.entidade}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Etapa destino</Label>
                <Select value={etapa} onValueChange={setEtapa}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={testar} disabled={enviando || !contratoId} className="w-full mt-2">
                  {enviando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Testar Envio
                </Button>
              </div>
            </div>

            {resposta && (
              <div className="space-y-2">
                <Label>Resposta da edge function</Label>
                <pre className="bg-muted p-3 rounded text-[11px] max-h-72 overflow-auto">
                  {JSON.stringify(resposta, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 pt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={carregarLogs}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Atualizar
              </Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem registros</TableCell></TableRow>
                  )}
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{l.destinatario_nome ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{l.numero_destinatario ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.etapa_destino ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell className="text-xs text-destructive max-w-xs truncate" title={l.erro ?? ""}>{l.erro ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-3 pt-4">
            <div className="flex justify-between items-center">
              <Label>Status da Configuração</Label>
              <Button variant="outline" size="sm" onClick={carregarHealth} disabled={loadingHealth}>
                {loadingHealth ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                Verificar
              </Button>
            </div>
            {health && (
              <div className="space-y-1 text-sm">
                {[
                  ["ZAPI_INSTANCE_ID", health.zapi_instance_id],
                  ["ZAPI_TOKEN", health.zapi_token],
                  ["ZAPI_CLIENT_TOKEN", health.zapi_client_token],
                  ["SUPABASE_URL", health.supabase_url],
                  ["SUPABASE_SERVICE_ROLE_KEY", health.service_role_key],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center gap-2">
                    {v ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="font-mono text-xs">{k as string}</span>
                    {health.previews?.[k as string] && (
                      <span className="text-xs text-muted-foreground">({health.previews[k as string]})</span>
                    )}
                  </div>
                ))}
                <pre className="bg-muted p-2 rounded text-[10px] mt-2 overflow-auto">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="backoffice" className="space-y-2 pt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={carregarBackoffices}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Atualizar
              </Button>
            </div>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backoffices.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem registros</TableCell></TableRow>
                  )}
                  {backoffices.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.nome}</TableCell>
                      <TableCell className="text-xs">{r.funcao}</TableCell>
                      <TableCell className="text-xs font-mono">{r.whatsapp || <span className="text-destructive">vazio</span>}</TableCell>
                      <TableCell>{r.ativo ? <Badge>sim</Badge> : <Badge variant="destructive">não</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}