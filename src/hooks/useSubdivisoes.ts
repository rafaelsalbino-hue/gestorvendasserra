import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSubdivisoes(entidade: string | null) {
  return useQuery({
    queryKey: ["unit-subdivisions", entidade],
    enabled: !!entidade && entidade !== "todas",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_subdivisions")
        .select("id,name,unit_name")
        .eq("unit_name", entidade as string)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string; unit_name: string }[];
    },
    staleTime: 1000 * 60 * 10,
  });
}