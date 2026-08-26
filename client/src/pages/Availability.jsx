import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAvailability, updateAvailability } from "../services/availabilityService";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/utils/cnFunc";
import { isValidTime } from "@/utils/validators";

import {
  DAYS_OF_WEEK,
  DEFAULT_AVAILABILITY,
  DEFAULT_SPLIT,
  BREAK_MINUTES,
  AVAILABILITY_TABS,
} from "@/constants/availability";
import { Loader } from "@/components/Loader";
import { Closures } from "@/components/availability/Closures";

// Da capire come migliorare
const timeInputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Continuato → spezzato: apertura e chiusura restano quelle scritte dall'utente,
// la pausa si infila al centro arrotondata alla mezz'ora. Se la giornata è troppo
// corta perché la pausa ci stia, si ripiega sugli orari di default.
const splitSlot = (slot) => {
  const start = timeToMinutes(slot.start_time);
  const end = timeToMinutes(slot.end_time);
  const breakStart = Math.round((start + end) / 2 / 30) * 30;

  if (breakStart <= start || breakStart + BREAK_MINUTES >= end) {
    return DEFAULT_SPLIT.map((defaultSlot) => ({ ...defaultSlot }));
  }

  return [
    { start_time: slot.start_time, end_time: minutesToTime(breakStart) },
    { start_time: minutesToTime(breakStart + BREAK_MINUTES), end_time: slot.end_time },
  ];
};

// Spezzato → continuato: da quando apre a quando chiude. Le fasce in più vengono
// buttate via davvero, non solo nascoste: se restassero nello stato finirebbero
// salvate e la pagina pubblica continuerebbe a offrire slot durante la pausa.
const mergeSlots = (slots) => [
  { start_time: slots[0].start_time, end_time: slots[slots.length - 1].end_time },
];

export const Availability = () => {
  const queryClient = useQueryClient();
  const [localAvailability, setLocalAvailability] = useState([]);
  const [activeTab, setActiveTab] = useState("orari");

  const { data, isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: fetchAvailability,
  });

  // L'API risponde con una lista piatta di fasce: qui si raggruppano per giorno,
  // e i giorni senza nessuna fascia salvata partono dai default.
  useEffect(() => {
    if (!data?.data) return;
    const merged = DAYS_OF_WEEK.map(({ id }) => {
      const daySlots = data.data.filter((slot) => slot.day_of_week === id);

      if (daySlots.length === 0) {
        const fallback = DEFAULT_AVAILABILITY.find((day) => day.day_of_week === id);
        return { ...fallback, slots: fallback.slots.map((slot) => ({ ...slot })) };
      }

      return {
        day_of_week: id,
        is_active: daySlots.some((slot) => slot.is_active),
        slots: daySlots.map(({ start_time, end_time }) => ({ start_time, end_time })),
      };
    });
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

  const updateDay = (index, changes) => {
    setLocalAvailability((prev) =>
      prev.map((day, i) => (i === index ? { ...day, ...changes(day) } : day))
    );
  };

  const handleToggleActive = (index) => {
    updateDay(index, (day) => ({ is_active: !day.is_active }));
  };

  const handleSetSplit = (index, split) => {
    updateDay(index, (day) => {
      if (split === (day.slots.length > 1)) return {};
      return { slots: split ? splitSlot(day.slots[0]) : mergeSlots(day.slots) };
    });
  };

  const handleTimeChange = (index, slotIndex, field, value) => {
    updateDay(index, (day) => ({
      slots: day.slots.map((slot, i) => (i === slotIndex ? { ...slot, [field]: value } : slot)),
    }));
  };

  // Solo i giorni attivi vengono controllati: su un giorno spento gli orari sono
  // disabilitati e possono restare vuoti. Sono le stesse tre regole applicate
  // dal backend, anticipate qui col nome del giorno per dire dove correggere.
  const handleSave = () => {
    for (const day of localAvailability) {
      if (!day.is_active) continue;

      const label = DAYS_OF_WEEK.find((d) => d.id === day.day_of_week)?.label ?? "Giorno";

      for (const slot of day.slots) {
        if (!isValidTime(slot.start_time) || !isValidTime(slot.end_time)) {
          return showError(`${label}: inserisci un orario di inizio e di fine validi`);
        }
        if (slot.start_time >= slot.end_time) {
          return showError(`${label}: l'orario di fine deve essere successivo a quello di inizio`);
        }
      }

      const ordered = [...day.slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 1; i < ordered.length; i++) {
        if (ordered[i].start_time < ordered[i - 1].end_time) {
          return showError(`${label}: le fasce orarie si sovrappongono`);
        }
      }
    }

    // Il server vuole una fascia per elemento, col giorno ripetuto quando è spezzato.
    const payload = localAvailability.flatMap((day) =>
      day.slots.map((slot) => ({
        day_of_week: day.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: day.is_active,
      }))
    );

    mutation.mutate(payload);
  };

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="page-in">
        <p className="text-[11px] font-bold text-primary-300 uppercase tracking-[0.08em] mb-2">Orari di lavoro</p>
        <h1><span className="volta-gradient-text">Disponibilità</span></h1>
        <p className="text-muted-foreground mt-2">
          Dicci quando lavori. Al resto — slot, conflitti, pause — pensiamo noi.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Sezioni della disponibilità"
        className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 page-in-d1"
      >
        {AVAILABILITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "chiusure" && <Closures />}

      {activeTab === "orari" && (isLoading ? <Loader /> : (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden page-in-d1">
        <div className="divide-y divide-border">
          {localAvailability.map((dayAvailability, index) => {
            const dayLabel = DAYS_OF_WEEK.find((d) => d.id === dayAvailability.day_of_week)?.label;
            const isSplit = dayAvailability.slots.length > 1;

            return (
              <div
                key={dayAvailability.day_of_week}
                className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors hover:bg-muted/10"
              >
                <div className="flex items-center justify-between sm:w-48 sm:pt-1.5">
                  <span className="font-medium">{dayLabel}</span>

                  {/* Custom Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dayAvailability.is_active}
                    aria-label={`${dayLabel}: giorno lavorativo`}
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
                    "flex flex-col gap-3 sm:items-end transition-opacity duration-200",
                    !dayAvailability.is_active && "opacity-50 pointer-events-none"
                  )}
                >
                  {/* Continuato / spezzato non è una colonna del database: è solo
                      quante fasce ha il giorno. */}
                  <div className="inline-flex self-start sm:self-end rounded-lg border border-border bg-muted/30 p-0.5">
                    {[
                      { label: "Continuato", split: false },
                      { label: "Spezzato", split: true },
                    ].map((mode) => (
                      <button
                        key={mode.label}
                        type="button"
                        aria-pressed={isSplit === mode.split}
                        disabled={!dayAvailability.is_active}
                        onClick={() => handleSetSplit(index, mode.split)}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                          isSplit === mode.split
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {dayAvailability.slots.map((slot, slotIndex) => {
                    const slotLabel = isSplit
                      ? slotIndex === 0
                        ? " (mattina)"
                        : " (pomeriggio)"
                      : "";

                    return (
                      <div key={slotIndex} className="flex items-center gap-3">
                        <input
                          type="time"
                          aria-label={`${dayLabel}: orario di inizio${slotLabel}`}
                          value={slot.start_time || ""}
                          onChange={(e) => handleTimeChange(index, slotIndex, "start_time", e.target.value)}
                          disabled={!dayAvailability.is_active}
                          className={timeInputClass}
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                          type="time"
                          aria-label={`${dayLabel}: orario di fine${slotLabel}`}
                          value={slot.end_time || ""}
                          onChange={(e) => handleTimeChange(index, slotIndex, "end_time", e.target.value)}
                          disabled={!dayAvailability.is_active}
                          className={timeInputClass}
                        />
                      </div>
                    );
                  })}
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
      ))}
    </div>
  );
};
