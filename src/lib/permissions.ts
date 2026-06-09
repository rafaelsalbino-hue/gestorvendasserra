/**
 * Permissões centralizadas (frontend). RLS no banco é a fonte de verdade —
 * isto apenas espelha a UI e evita confusão.
 */

export interface RoleFlags {
  isAdmin: boolean;
  isGestor: boolean;
  isCoordenador: boolean;
  isBackoffice: boolean;
  isVendedor: boolean;
  isSecretaria: boolean;
  isInterlocutora: boolean;
}

export interface ContratoLike {
  agente_pj_id?: string | null;
  finalized_at?: string | null;
  deleted_at?: string | null;
}

export function canCreateVisita(r: RoleFlags) {
  // Qualquer usuário autenticado pode lançar uma visita (inclui supervisores,
  // secretarias, interlocutoras e operadores). RLS no banco também permite.
  return true;
}

export function canImportar(r: RoleFlags) {
  return r.isAdmin || r.isVendedor || r.isCoordenador;
}

export function canDeleteContrato(r: RoleFlags) {
  return r.isAdmin;
}

/**
 * Backoffice pode excluir/arquivar contratos até a etapa "Proposta/CRM".
 * Admin/gestor pode excluir em qualquer etapa.
 */
export function canDeleteContratoAt(
  r: RoleFlags,
  contrato: ContratoLike & { etapa_atual?: string | null },
) {
  if (r.isAdmin) return true;
  if (contrato.finalized_at) return false;
  if (r.isBackoffice) {
    const etapa = (contrato.etapa_atual ?? "").toString();
    return etapa === "visita" || etapa === "proposta";
  }
  return false;
}

export function canFinalizarContrato(r: RoleFlags) {
  return r.isAdmin || r.isBackoffice || r.isCoordenador;
}

export function canReabrirContrato(r: RoleFlags) {
  return r.isAdmin || r.isCoordenador;
}

export function canMoverStatus(r: RoleFlags) {
  // Praticamente todos perfis ativos podem mover status (RLS detalha o quê).
  return (
    r.isAdmin ||
    r.isCoordenador ||
    r.isBackoffice ||
    r.isVendedor ||
    r.isSecretaria ||
    r.isInterlocutora
  );
}

export function canEditContrato(
  r: RoleFlags,
  contrato: ContratoLike,
  meResponsavelId?: string | null,
) {
  if (r.isAdmin || r.isCoordenador) return true;
  if (contrato.finalized_at) return false;
  if (r.isBackoffice) return true;
  if (r.isVendedor)
    return !!meResponsavelId && contrato.agente_pj_id === meResponsavelId;
  return false;
}