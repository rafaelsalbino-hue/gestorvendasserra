import type { Entidade } from "@/types/contracts";

export const ENTIDADE_LABEL: Record<Entidade, string> = {
  "SESI": "SESI Educação",
  "SENAI": "SENAI",
  "SESI Saúde": "SESI Saúde",
  "REDE": "REDE",
};

export const ENTIDADE_CLASS: Record<Entidade, string> = {
  "SESI": "ent-sesi-edu",
  "SENAI": "ent-senai",
  "SESI Saúde": "ent-sesi-saude",
  "REDE": "ent-rede",
};

export function entidadeShort(e: Entidade | string): string {
  if (e === "SESI") return "SESI Edu";
  if (e === "SESI Saúde") return "SESI Saúde";
  if (e === "REDE") return "REDE";
  return e;
}