import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export function SectionLock({ locked }: { locked: boolean }) {
  if (!locked) return null;
  return (
    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground font-normal">
      <Lock className="h-3 w-3" /> Somente leitura
    </Badge>
  );
}