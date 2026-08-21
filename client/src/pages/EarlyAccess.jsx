import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/api/client";
import { validateForm } from "@/utils/validators";
import { waitlistRules } from "@/constants/validation";

export const EarlyAccess = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { errors, values } = validateForm({ email }, waitlistRules);
    if (errors.length > 0) return setError(errors[0]);

    setError(null);
    setLoading(true);
    try {
      await api.post("/api/waitlist", values);
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch {
      setError("Qualcosa è andato storto. Riprova.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl shadow-sm shadow-primary-500/30"
            style={{ background: "var(--volta-gradient)" }}
          >
            <span className="text-white font-extrabold text-xl tracking-tight">V</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight lowercase">volta</h1>
          <p className="text-sm text-muted-foreground">Accesso anticipato alla beta.</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {done ? (
            <p className="text-sm font-medium text-center py-4">
              Ottimo! Ti contatteremo a breve. 🎉
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Sei tra i primi.</h2>
                <p className="text-xs text-muted-foreground">
                  Lascia la tua email per essere contattato quando l'accesso sarà attivo.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium text-center">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@esempio.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Attendere..." : "Richiedi accesso"}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center">
                Nessuno spam. Solo accesso anticipato.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
