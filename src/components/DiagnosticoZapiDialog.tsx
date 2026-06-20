import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StatusResp {
  ok: boolean;
  secretsLoaded: Record<string, boolean>;
  secretsPreview: Record<string, string>;
  httpStatus: number;
  instanceStatus: any;
  statusError: string | null;
}

export function DiagnosticoZapiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatusResp | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setData(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/enviar-whatsapp?action=status`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "GET",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      const json = await resp.json();
      setData(json);
    } catch (err: any) {
      toast.error("Falha ao consultar Z-API", { description: String(err?.message ?? err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v && !data && !loading) fetchStatus();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#003DA5]" />
            Diagnóstico Z-API
          </DialogTitle>
          <DialogDescription>Verifica conexão da instância e secrets configurados.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Consultando...
          </div>
        )}

        {data && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-1">Secrets carregados</div>
              {(["ZAPI_INSTANCE_ID", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN"] as const).map((k) => {
                const ok = data.secretsLoaded[k];
                return (
                  <div key={k} className="flex items-center gap-2">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="font-mono text-xs">{k}</span>
                    {ok && <span className="text-xs text-muted-foreground">({data.secretsPreview[k]})</span>}
                  </div>
                );
              })}
            </div>

            <div>
              <div className="font-semibold mb-1">Instância Z-API</div>
              {data.statusError ? (
                <div className="text-destructive text-xs">{data.statusError}</div>
              ) : (
                <>
                  <div className="text-xs">HTTP: {data.httpStatus}</div>
                  <div className="flex items-center gap-2">
                    {data.instanceStatus?.connected ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>connected: <b>{String(data.instanceStatus?.connected)}</b></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.instanceStatus?.smartphoneConnected ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>smartphoneConnected: <b>{String(data.instanceStatus?.smartphoneConnected)}</b></span>
                  </div>
                  <pre className="mt-2 text-[10px] bg-muted p-2 rounded max-h-40 overflow-auto">
                    {JSON.stringify(data.instanceStatus, null, 2)}
                  </pre>
                </>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
              Atualizar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}