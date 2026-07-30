import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMPTY } from "./constants";

export function StatusSelect({ label, value, options, onChange, disabled }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)} disabled={disabled}>
        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY}>— Não definido —</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}