import { CodeCreator } from "@/components/settingsPage/CodeCreator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import { Sun, Moon, Laptop } from "lucide-react";

export const Settings = () => {
  const { logout } = useAuth();
  const { theme, setTheme } = useThemeContext();

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div className="page-in">
        <p className="text-[11px] font-bold text-primary-300 uppercase tracking-[0.08em] mb-2">Preferenze</p>
        <h1><span className="volta-gradient-text">Impostazioni</span></h1>
        <p className="text-muted-foreground mt-2">
          Il tuo link, il tuo tema, il tuo account. Tutto al posto giusto.
        </p>
      </div>

      <div className="page-in-d1">
        <CodeCreator />
      </div>

      <div className="space-y-6 page-in-d2">
        <div>
          <h2 className="text-lg font-medium mb-1">Tema</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Scuro di default, chiaro quando vuoi. Volta si adatta a te.
          </p>
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                theme === "light" ?
                  "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Sun className="w-6 h-6 mb-3" />
              <span className="text-sm font-medium">Chiaro</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                theme === "dark" ?
                  "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Moon className="w-6 h-6 mb-3" />
              <span className="text-sm font-medium">Scuro</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all duration-200 ${
                theme === "system" ?
                  "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Laptop className="w-6 h-6 mb-3" />
              <span className="text-sm font-medium">Sistema</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <h2 className="text-lg font-medium mb-1">Account</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esci da Volta su questo dispositivo. Tutto resta salvo.
          </p>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="w-full sm:w-auto h-11 gap-3 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Esci
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Versione: <span className="font-medium"> BETA {import.meta.env.VITE_APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
};
