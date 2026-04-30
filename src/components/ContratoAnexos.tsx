import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useContratoAnexos,
  useUploadAnexo,
  useDeleteAnexo,
  getAnexoSignedUrl,
} from "@/hooks/useContratoAnexos";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContratoAnexos({ contratoId }: { contratoId: string }) {
  const { toast } = useToast();
  const { currentUser } = useCurrentUser();
  const { data: anexos = [], isLoading } = useContratoAnexos(contratoId);
  const upload = useUploadAnexo();
  const del = useDeleteAnexo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; storage_path: string; file_name: string } | null>(null);

  const handleFile = (file: File) => {
    if (file.size > MAX_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: "O limite é 25 MB.",
        variant: "destructive",
      });
      return;
    }
    upload.mutate(
      { contratoId, file, uploaderNome: currentUser?.nome || "Desconhecido" },
      {
        onSuccess: () => toast({ title: "Arquivo enviado!" }),
        onError: (e) =>
          toast({ title: "Erro no upload", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDownload = async (anexo: { id: string; storage_path: string; file_name: string }) => {
    try {
      setDownloadingId(anexo.id);
      const url = await getAnexoSignedUrl(anexo.storage_path);
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
      { id: pendingDelete.id, storage_path: pendingDelete.storage_path, contrato_id: contratoId },
      {
        onSuccess: () => {
          toast({ title: "Arquivo excluído." });
          setPendingDelete(null);
        },
        onError: (e) =>
          toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Anexos da Proposta
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          Enviar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando anexos...</p>
      ) : anexos.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="space-y-1.5">
          {anexos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(a.file_size)} · {a.uploader_nome} ·{" "}
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(a)}
                disabled={downloadingId === a.id}
                title="Baixar"
              >
                {downloadingId === a.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setPendingDelete({ id: a.id, storage_path: a.storage_path, file_name: a.file_name })}
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
              Esta ação é irreversível. O arquivo "{pendingDelete?.file_name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}