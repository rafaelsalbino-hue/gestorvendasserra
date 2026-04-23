import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useContratos } from "@/hooks/useContratos";
import { useNavigate } from "react-router-dom";
import { ETAPAS } from "@/types/contracts";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: contratos = [] } = useContratos();
  const navigate = useNavigate();

  const results = query.length >= 2
    ? contratos.filter((c) =>
        c.cliente.toLowerCase().includes(query.toLowerCase()) ||
        c.cnpj.includes(query) ||
        c.numero_rpc.toLowerCase().includes(query.toLowerCase()) ||
        c.numero_chamado.toLowerCase().includes(query.toLowerCase()) ||
        c.crm.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contratos..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-8 pr-8 h-9 w-full sm:w-64 text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
          {results.map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex flex-col border-b last:border-0"
              onClick={() => {
                navigate(`/contratos?highlight=${c.id}`);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-medium">{c.cliente}</span>
              <span className="text-xs text-muted-foreground">
                {c.cnpj} · {c.entidade} · {ETAPAS.find((e) => e.id === c.etapa_atual)?.label}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg z-50 p-3 text-sm text-muted-foreground text-center">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}
