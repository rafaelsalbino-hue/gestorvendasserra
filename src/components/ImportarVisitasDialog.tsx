import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { validarCNPJ } from "@/lib/cnpj";
import { SUBDIVISIONS_BY_UNIT, type Entidade } from "@/types/contracts";
import { parseBRL } from "@/lib/currency";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Status = "ok" | "ignorada" | "invalida";

interface LinhaPrevia {
  linha: number;
  entidade: string;
  cliente: string;
  cnpj: string;
  cnpjLimpo: string;
  data_visita: string;
  servico_produto: string;
  valor: number;
  subdivisao: string;
  observacoes_visita: string;
  dados_proposta: string;
  crm: string;
  agente_pj_nome: string;
  status: Status;
  motivo?: string;
}

const ENTIDADES_VALIDAS: Entidade[] = ["SESI", "SENAI", "SESI Saúde", "REDE"];
const ENTIDADE_LABEL: Record<string, Entidade> = {
  "SESI": "SESI",
  "SESI Educação": "SESI",
  "SENAI": "SENAI",
  "SENAI Ed. Profissional": "SENAI",
  "SESI Saúde": "SESI Saúde",
  "SESI Saude": "SESI Saúde",
  "REDE": "REDE",
};

const COLUNAS_MODELO = [
  "Entidade", "Área / Subdivisão", "Cliente", "CNPJ",
  "Serviço / Produto", "Valor (R$)", "CRM", "Agente PJ Responsável",
  "Data da Visita", "Observações da Visita", "Dados para a Proposta",
] as const;

function baixarModelo() {
  const exemplo = [
    {
      "Entidade": "SESI Educação",
      "Área / Subdivisão": "Contraturno",
      "Cliente": "Empresa Exemplo LTDA",
      "CNPJ": "00.000.000/0001-00",
      "Serviço / Produto": "Curso de robótica",
      "Valor (R$)": "1500,00",
      "CRM": "CRM-12345",
      "Agente PJ Responsável": "Nome do Agente",
      "Data da Visita": "15/01/2026",
      "Observações da Visita": "Cliente interessado",
      "Dados para a Proposta": "Pacote anual, 2 turmas",
    },
    {
      "Entidade": "SESI Saúde",
      "Área / Subdivisão": "SST",
      "Cliente": "Outra Empresa",
      "CNPJ": "11.111.111/0001-11",
      "Serviço / Produto": "Exames ocupacionais",
      "Valor (R$)": "2300,50",
      "CRM": "",
      "Agente PJ Responsável": "",
      "Data da Visita": "16/01/2026",
      "Observações da Visita": "",
      "Dados para a Proposta": "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(exemplo, { header: COLUNAS_MODELO as any });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Visitas");
  XLSX.writeFile(wb, "modelo_importacao_visitas.xlsx");
}

function baixarRelatorioErros(linhas: { linha: number; motivo?: string; cliente?: string; cnpj?: string }[]) {
  const cab = ["linha", "cliente", "cnpj", "motivo"].join(";");
  const rows = linhas.map((l) =>
    [l.linha, `"${(l.cliente || "").replace(/"/g, '""')}"`, l.cnpj || "", `"${(l.motivo || "").replace(/"/g, '""')}"`].join(";"),
  );
  const csv = "\uFEFF" + [cab, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio_erros_importacao_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseData(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // serial number Excel
  const n = Number(s);
  if (!isNaN(n) && n > 25569) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return "";
}

function parseValor(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/^R\$\s*/i, "");
  // suporta "12000,00", "12.000,00" e "12000.00"
  if (/^\d+(\.\d{3})*,\d{1,2}$/.test(s) || /^\d+,\d{1,2}$/.test(s)) return parseBRL(s);
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return parseBRL(s) || 0;
}

function val(r: any, ...keys: string[]) {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "") return r[k];
  }
  return "";
}

export function ImportarVisitasDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaPrevia[]>([]);
  const [importando, setImportando] = useState(false);
  const [arquivo, setArquivo] = useState<string>("");

  const resetar = () => {
    setLinhas([]);
    setArquivo("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = (o: boolean) => {
    if (!o) resetar();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    setArquivo(file.name);
    const nome = file.name.toLowerCase();
    if (!nome.endsWith(".xlsx") && !nome.endsWith(".xls") && !nome.endsWith(".csv")) {
      toast({
        title: "Formato inválido",
        description: "Envie um arquivo .xlsx, .xls ou .csv.",
        variant: "destructive",
      });
      setArquivo("");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    let rows: any[] = [];
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Sem planilha");
      rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    } catch (e: any) {
      toast({ title: "Não foi possível ler o arquivo", description: e?.message || "Verifique o formato.", variant: "destructive" });
      return;
    }
    if (!rows || rows.length === 0) {
      toast({ title: "Planilha vazia", description: "Nenhuma linha encontrada além do cabeçalho.", variant: "destructive" });
      return;
    }

    // Busca contratos existentes (CNPJ + data) para detectar duplicatas
    const { data: existentes } = await supabase
      .from("contratos")
      .select("cnpj, data_visita")
      .is("deleted_at", null);
    const chavesExistentes = new Set(
      (existentes ?? [])
        .filter((c: any) => c.cnpj && c.data_visita)
        .map((c: any) => `${String(c.cnpj).replace(/\D/g, "")}|${c.data_visita}`),
    );

    const chavesArquivo = new Set<string>();
    const previa: LinhaPrevia[] = rows.map((r, idx) => {
      const entidadeRaw = String(val(r, "Entidade", "entidade")).trim();
      const entidade = ENTIDADE_LABEL[entidadeRaw] ?? (entidadeRaw as any);
      const subdivisao = String(val(r, "Área / Subdivisão", "Area / Subdivisao", "Subdivisão", "subdivisao", "Subdivisao")).trim();
      const cliente = String(val(r, "Cliente", "cliente")).trim();
      const cnpjRaw = String(val(r, "CNPJ", "cnpj")).trim();
      const cnpjLimpo = cnpjRaw.replace(/\D/g, "");
      const servico_produto = String(val(r, "Serviço / Produto", "Serviço/Produto", "servico_produto")).trim();
      const valor = parseValor(val(r, "Valor (R$)", "Valor", "valor"));
      const crm = String(val(r, "CRM", "crm")).trim();
      const agente_pj_nome = String(val(r, "Agente PJ Responsável", "Agente PJ", "agente_pj")).trim();
      const data_visita = parseData(val(r, "Data da Visita", "Data Visita", "data_visita", "data"));
      const observacoes_visita = String(val(r, "Observações da Visita", "Observações", "observacoes_visita", "observacoes")).trim();
      const dados_proposta = String(val(r, "Dados para a Proposta", "Dados Proposta", "dados_proposta")).trim();

      let status: Status = "ok";
      let motivo: string | undefined;

      if (!cliente) {
        status = "invalida"; motivo = "Cliente vazio";
      } else if (!entidadeRaw) {
        status = "invalida"; motivo = "Entidade obrigatória";
      } else if (!ENTIDADES_VALIDAS.includes(entidade as Entidade)) {
        status = "invalida"; motivo = `Entidade inválida (use SESI Educação, SENAI ou SESI Saúde)`;
      } else if (!data_visita) {
        status = "invalida"; motivo = "Data da visita obrigatória (DD/MM/AAAA)";
      } else if (cnpjRaw && !validarCNPJ(cnpjLimpo)) {
        status = "invalida"; motivo = "CNPJ em formato inválido";
      } else if ((SUBDIVISIONS_BY_UNIT[entidade as Entidade] || []).length > 0 && !subdivisao) {
        status = "invalida"; motivo = `Área / Subdivisão obrigatória para ${entidadeRaw}`;
      } else if (subdivisao && !(SUBDIVISIONS_BY_UNIT[entidade as Entidade] || []).includes(subdivisao)) {
        status = "invalida"; motivo = `Subdivisão "${subdivisao}" não é válida para ${entidadeRaw}`;
      } else if (cnpjLimpo && data_visita) {
        const chave = `${cnpjLimpo}|${data_visita}`;
        if (chavesExistentes.has(chave) || chavesArquivo.has(chave)) {
          status = "ignorada"; motivo = "Duplicata (CNPJ + data já existe)";
        } else {
          chavesArquivo.add(chave);
        }
      }

      return {
        linha: idx + 2,
        entidade, cliente, cnpj: cnpjRaw, cnpjLimpo, data_visita,
        servico_produto, valor, subdivisao, observacoes_visita,
        dados_proposta, crm, agente_pj_nome,
        status, motivo,
      };
    });

    setLinhas(previa);
  };

  const importaveis = linhas.filter((l) => l.status === "ok");
  const duplicadas = linhas.filter((l) => l.status === "ignorada");
  const invalidas = linhas.filter((l) => l.status === "invalida");

  const handleImportar = async () => {
    if (importaveis.length === 0) return;
    setImportando(true);
    try {
      // Resolve agente PJ por nome (best-effort)
      const nomes = Array.from(new Set(importaveis.map((l) => l.agente_pj_nome).filter(Boolean)));
      let agentesMap: Record<string, string> = {};
      if (nomes.length > 0) {
        const { data: ags } = await supabase
          .from("responsaveis")
          .select("id, nome")
          .eq("funcao", "Agente de Mercado PJ")
          .in("nome", nomes);
        agentesMap = Object.fromEntries((ags ?? []).map((a: any) => [a.nome.toLowerCase(), a.id]));
      }
      const payload = importaveis.map((l) => ({
        entidade: l.entidade as Entidade,
        cliente: l.cliente,
        cnpj: l.cnpj,
        data_visita: l.data_visita,
        servico_produto: l.servico_produto,
        valor: l.valor,
        crm: l.crm,
        dados_proposta: l.dados_proposta,
        agente_pj_id: agentesMap[l.agente_pj_nome.toLowerCase()] || null,
        subdivisao: l.subdivisao || null,
        observacoes_visita: l.observacoes_visita,
        etapa_atual: "visita" as const,
      }));
      const { error } = await supabase.from("contratos").insert(payload as any);
      if (error) throw error;
      toast({
        title: "Importação concluída",
        description: `${importaveis.length} visita(s) importada(s) com sucesso. ${duplicadas.length} ignorada(s) (duplicata). ${invalidas.length} com erro.`,
      });
      qc.invalidateQueries({ queryKey: ["contratos"] });
      handleClose(false);
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Visitas (XLSX)</DialogTitle>
          <DialogDescription>
            Baixe o modelo, preencha as visitas e faça o upload. Duplicatas (mesmo CNPJ + data) são ignoradas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={baixarModelo}>
            <Download className="mr-2 h-4 w-4" /> Baixar modelo
          </Button>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Selecionar arquivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {arquivo && (
            <span className="text-sm text-muted-foreground self-center">
              {arquivo}
            </span>
          )}
        </div>

        {linhas.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {importaveis.length} a importar
              </Badge>
              {duplicadas.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {duplicadas.length} ignorada(s)
                </Badge>
              )}
              {invalidas.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {invalidas.length} inválida(s)
                </Badge>
              )}
            </div>

            {duplicadas.length > 0 && (
              <Alert>
                <AlertDescription className="text-xs">
                  Linhas duplicadas (mesmo CNPJ e data de visita) serão ignoradas.
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.linha} className={
                      l.status === "invalida" ? "bg-destructive/5" :
                      l.status === "ignorada" ? "bg-muted/40" : ""
                    }>
                      <TableCell className="text-xs">{l.linha}</TableCell>
                      <TableCell>
                        {l.status === "ok" && <Badge variant="default" className="text-[10px]">OK</Badge>}
                        {l.status === "ignorada" && <Badge variant="secondary" className="text-[10px]">Ignorada</Badge>}
                        {l.status === "invalida" && <Badge variant="destructive" className="text-[10px]">Inválida</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">{l.entidade}</TableCell>
                      <TableCell className="text-xs">{l.cliente}</TableCell>
                      <TableCell className="text-xs">{l.cnpj}</TableCell>
                      <TableCell className="text-xs">{l.data_visita}</TableCell>
                      <TableCell className="text-xs">
                        {l.valor > 0 ? `R$ ${l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.motivo || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importando}>
            Cancelar
          </Button>
          {invalidas.length > 0 && (
            <Button
              variant="outline"
              onClick={() => baixarRelatorioErros(invalidas)}
              disabled={importando}
            >
              <Download className="mr-2 h-4 w-4" /> Baixar relatório de erros
            </Button>
          )}
          <Button
            onClick={handleImportar}
            disabled={importando || importaveis.length === 0}
          >
            {importando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar importação ({importaveis.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}