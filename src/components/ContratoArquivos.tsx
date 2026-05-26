import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useContratoArquivos,
  useUploadArquivo,
  useDeleteArquivo,
  getArquivoSignedUrl,
  type ArquivoCategoria,
} from "@/hooks/useContratoArquivos";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

const MAX_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  contratoId: string;
  categoria: ArquivoCategoria;
  label: string;
  accept?: string;
  allowMultiple?: boolean;
  disabled?: boolean;
  /** Substitui o arquivo anterior automaticamente (somente último arquivo é mantido) */
  singleFile?: boolean;
}

export function ContratoArquivos({ contratoId, categoria, label, accept, allowMultiple = false, disabled, singleFile = false }: Props) {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const { data: arquivos = [], isLoading } = useContratoArquivos(contratoId, categoria);
  const upload = useUploadArquivo();
  const del = useDeleteArquivo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        toast({ title: "Arquivo muito grande", description: `"${file.name}" excede 25 MB.`, variant: "destructive" });
        continue;
      }
      try {
        // Se for single file (ex: chamado de faturamento), remove anteriores
        if (singleFile && arquivos.length > 0) {
          for (const old of arquivos) {
            await new Promise<void>((resolve) => {
              del.mutate(
                { id: old.id, storage_path: old.storage_path, contrato_id: contratoId, categoria },
                { onSettled: () => resolve() }
              );
            });
          }
        }
        await new Promise<void>((resolve, reject) => {
          upload.mutate(
            { contratoId, categoria, file, uploaderNome: currentUser?.nome || "Desconhecido" },
            {
              onSuccess: () => resolve(),
              onError: (e: any) => { toast({ title: "Erro no upload", description: e.message, variant: "destructive" }); reject(e); },
            }
          );
        });
      } catch { /* já notificado */ }
    }
    toast({ title: "Upload concluído" });
  };

  const handleDownload = async (arq: any) => {
    try {
      setDownloadingId(arq.id);
      const url = await getArquivoSignedUrl(arq.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Erro ao baixar", description: e.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    del.mutate(
      { id: pendingDelete.id, storage_path: pendingDelete.storage_path, contrato_id: contratoId, categoria },
      {
        onSuccess: () => { toast({ title: "Arquivo excluído." }); setPendingDelete(null); },
        onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
      }
    );
  };

  const buttonLabel = singleFile && arquivos.length > 0 ? "Substituir" : "Enviar arquivo";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs font-medium">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || upload.isPending || del.isPending}
        >
          {upload.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          {upload.isPending ? "Enviando..." : buttonLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={allowMultiple}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : arquivos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum arquivo enviado.</p>
      ) : (
        <ul className="space-y-1.5">
          {arquivos.map((a: any) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-xs">{a.file_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSize(a.file_size)} · {a.uploader_nome} · {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(a)} disabled={downloadingId === a.id} title="Baixar">
                {downloadingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setPendingDelete(a)}
                disabled={disabled}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. "{pendingDelete?.file_name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Import Label after declarations (avoid hoist issues with patch)
import { Label } from "@/components/ui/label";