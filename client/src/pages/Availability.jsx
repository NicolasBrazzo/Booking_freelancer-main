import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAvailability, updateAvailability } from "../services/availabilityService";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/utils/cnFunc";
import { isValidTime } from "@/utils/validators";

import { DAYS_OF_WEEK, DEFAULT_AVAILABILITY } from "@/constants/availability";
import { Loader } from "@/components/Loader";

// Da capire come migliorare
const timeInputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const Availability = () => {
  const queryClient = useQueryClient();
  const [localAvailability, setLocalAvailability] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: fetchAvailability,
  });

  useEffect(() => {
    if (!data?.data) return;
    const merged = DAYS_OF_WEEK.map(({ id }) =>
      data.data.find((d) => d.day_of_week === id) ??
      DEFAULT_AVAILABILITY.find((d) => d.day_of_week === id)
    );
    setLocalAvailability(merged);
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateAvailability,
    onSuccess: () => {
      showSuccess("Orari aggiornati.");
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: () => {
      showError("Qualcosa è andato storto. Riprova tra un istante.");
    },
  });

  // Migliorabile
  const handleToggleActive = (index) => {
    const updated = [...localAvailability];
    updated[index] = { ...updated[index], is_active: !updated[index].is_active };
    setLocalAvailability(updated);
  };

  const handleTimeChange = (index, field, value) => {
    const updated = [...localAvailability];
    updated[index] = { ...updated[index], [field]: value };
    setLocalAvailability(updated);
  };

  // Solo i giorni attivi vengono controllati: su un giorno spento gli orari sono
  // disabilitati e possono restare vuoti. Sono le stesse due regole applicate
  // dal backend, anticipate qui col nome del giorno per dire dove correggere.
  const handleSave = () => {
    for (const day of localAvailability) {
      if (!day.is_active) continue;

      const label = DAYS_OF_WEEK.find((d) => d.id === day.day_of_week)?.label ?? "Giorno";

      if (!isValidTime(day.start_time) || !isValidTime(day.end_time)) {
        return showError(`${label}: inserisci un orario di inizio e di fine validi`);
      }
      if (day.start_time >= day.end_time) {
        return showError(`${label}: l'orario di fine deve essere successivo a quello di inizio`);
      }
    }

    mutation.mutate(localAvailability);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="page-in">
        <p className="text-[11px] font-bold text-primary-300 uppercase tracking-[0.08em] mb-2">Orari di lavoro</p>
        <h1><span className="volta-gradient-text">Disponibilità</span></h1>
        <p className="text-muted-foreground mt-2">
          Dicci quando lavori. Al resto — slot, conflitti, pause — pensiamo noi.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden page-in-d1">
        <div className="divide-y divide-border">
          {localAvailability.map((dayAvailability, index) => {
            const dayLabel = DAYS_OF_WEEK.find((d) => d.id === dayAvailability.day_of_week)?.label;
            return (
              <div
                key={dayAvailability.day_of_week}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/10"
              >
                <div className="flex items-center justify-between sm:w-48">
                  <span className="font-medium">{dayLabel}</span>

                  {/* Custom Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dayAvailability.is_active}
                    onClick={() => handleToggleActive(index)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      dayAvailability.is_active ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                        dayAvailability.is_active ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-3 transition-opacity duration-200",
                    !dayAvailability.is_active && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1 sr-only">Inizio</label>
                    <input
                      type="time"
                      value={dayAvailability.start_time || ""}
                      onChange={(e) => handleTimeChange(index, "start_time", e.target.value)}
                      disabled={!dayAvailability.is_active}
                      className={timeInputClass}
                    />
                  </div>
                  <span className="text-muted-foreground">-</span>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1 sr-only">Fine</label>
                    <input
                      type="time"
                      value={dayAvailability.end_time || ""}
                      onChange={(e) => handleTimeChange(index, "end_time", e.target.value)}
                      disabled={!dayAvailability.is_active}
                      className={timeInputClass}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 bg-muted/20 border-t border-border flex justify-end">
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? "Salvataggio..." : "Salva le modifiche"}
          </Button>
        </div>
      </div>
    </div>
  );
};
