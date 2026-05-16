import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const NotFound = () => {
  const location = useLocation();
  useDocumentTitle("Página não encontrada");

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Compass className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Erro 404</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Página não encontrada</h1>
          <p className="text-muted-foreground">
            O endereço <code className="px-1.5 py-0.5 rounded bg-muted text-xs break-all">{location.pathname}</code> não existe ou foi movido.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" className="min-h-11" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button asChild className="min-h-11">
            <Link to="/"><Home className="mr-2 h-4 w-4" /> Ir para o Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
