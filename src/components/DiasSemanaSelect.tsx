import { cn } from "@/lib/utils";

const DIAS = [
  { value: "segunda", short: "Seg" },
  { value: "terca", short: "Ter" },
  { value: "quarta", short: "Qua" },
  { value: "quinta", short: "Qui" },
  { value: "sexta", short: "Sex" },
  { value: "sabado", short: "Sáb" },
  { value: "domingo", short: "Dom" },
];

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function DiasSemanaSelect({ value, onChange, disabled }: Props) {
  const toggle = (d: string) => {
    if (disabled) return;
    if (value.includes(d)) onChange(value.filter((v) => v !== d));
    else onChange([...value, d]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {DIAS.map((d) => {
        const active = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            disabled={disabled}
            className={cn(
              "h-8 min-w-[42px] rounded-md border px-2 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}