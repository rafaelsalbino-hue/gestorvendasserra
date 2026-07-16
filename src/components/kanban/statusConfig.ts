export interface StatusOption {
  value: string;
  label: string;
  color: string; // tailwind bg-*
  text: string;  // tailwind text-*
}

export const STATUS_NEGOCIACAO: StatusOption[] = [
  { value: "sem_status", label: "Sem status", color: "bg-gray-400", text: "text-gray-600 dark:text-gray-300" },
  { value: "em_elaboracao", label: "Em elaboração", color: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" },
  { value: "em_negociacao", label: "Em Negociação", color: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  { value: "ganha", label: "Ganha", color: "bg-green-500", text: "text-green-700 dark:text-green-300" },
  { value: "perdido", label: "Perdido", color: "bg-red-500", text: "text-red-700 dark:text-red-300" },
  { value: "cancelada", label: "Cancelada", color: "bg-gray-600", text: "text-gray-700 dark:text-gray-300" },
];

export function getStatus(value: string | null | undefined): StatusOption {
  return STATUS_NEGOCIACAO.find((s) => s.value === value) ?? STATUS_NEGOCIACAO[0];
}

export const ETAPA_COLORS: Record<string, string> = {
  visita: "#3b82f6",
  crm: "#2563eb",
  supervisor: "#4f46e5",
  proposta: "#7c3aed",
  rpc: "#9333ea",
  execucao: "#c026d3",
  matricula: "#db2777",
  ensalamento: "#e11d48",
  faturamento: "#ea580c",
  finalizado: "#16a34a",
};

export const ENTIDADE_BADGE: Record<string, string> = {
  SENAI: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "SESI Saúde": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  SESI: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  REDE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};