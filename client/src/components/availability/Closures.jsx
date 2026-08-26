import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DayPicker } from "react-day-picker";
import { it } from "react-day-picker/locale";
import { CalendarOff } from "lucide-react";

import { fetchExceptions, updateClosures } from "@/services/availabilityExceptionsService";
import { fetchBookings } from "@/services/bookingsService";
import { closureRules } from "@/constants/validation";
import { CLOSURE_WINDOW_MONTHS } from "@/constants/availability";
import { validateForm } from "@/utils/validators";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";
import Modal from "@/components/Modal";

// Le date viaggiano come "YYYY-MM-DD" e vanno formattate sul fuso locale:
// toISOString() lavora in UTC e a mezzanotte italiana restituirebbe il giorno
// prima, chiudendo la data sbagliata.
const toDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromDateString = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatLong = (date) =>
  date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" });

export const Closures = () => {
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState([]);
  const [note, setNote] = useState("");
  const [isConflictOpen, setIsConflictOpen] = useState(false);

  // Finestra fissa: navigare fra i mesi non deve poter toccare chiusure fuori vista.
  const { windowStart, windowEnd, from, to } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + CLOSURE_WINDOW_MONTHS);
    return { windowStart: start, windowEnd: end, from: toDateString(start), to: toDateString(end) };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["exceptions", from, to],
    queryFn: () => fetchExceptions(from, to),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ["bookings", "confirmed"],
    queryFn: () => fetchBookings("confirmed"),
  });

  // Solo le chiusure di giornata intera: le righe con orari valorizzati sono
  // previste dallo schema (orario straordinario su una data) ma nessuna
  // schermata le produce ancora, e questo calendario non le rappresenta.
  const savedDates = useMemo(
    () => (data?.data ?? []).filter((row) => !row.start_time).map((row) => row.date),
    [data]
  );

  useEffect(() => {
    setSelectedDays(savedDates.map(fromDateString));
  }, [savedDates]);

  const selectedDates = useMemo(
    () => selectedDays.map(toDateString).sort(),
    [selectedDays]
  );

  // Le prenotazioni già prese non spariscono: contano solo le date che si stanno
  // chiudendo adesso, non quelle già chiuse in un salvataggio precedente.
  const conflicts = useMemo(() => {
    const added = selectedDates.filter((date) => !savedDates.includes(date));
    if (added.length === 0) return [];

    return (bookingsData?.data ?? [])
      .filter((booking) => added.includes(toDateString(new Date(booking.date))))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedDates, savedDates, bookingsData]);

  const mutation = useMutation({
    mutationFn: updateClosures,
    onSuccess: () => {
      showSuccess("Chiusure aggiornate.");
      queryClient.invalidateQueries({ queryKey: ["exceptions"] });
    },
    onError: (error) => {
      showError(error?.message ?? "Qualcosa è andato storto. Riprova tra un istante.");
    },
  });

  const save = () => {
    mutation.mutate({ from, to, dates: selectedDates, note: note.trim() });
  };

  // Le stesse regole del backend, anticipate qui perché il messaggio non cambi
  // prima e dopo la chiamata di rete.
  const handleSave = () => {
    const { errors } = validateForm({ from, to, dates: selectedDates, note: note.trim() }, closureRules);
    if (errors.length > 0) return showError(errors[0]);

    if (conflicts.length > 0) return setIsConflictOpen(true);
    save();
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden page-in-d1">
        <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-8">
          <div className="flex justify-center lg:justify-start">
            <DayPicker
              mode="multiple"
              locale={it}
              selected={selectedDays}
              onSelect={(days) => setSelectedDays(days ?? [])}
              disabled={{ before: windowStart }}
              startMonth={windowStart}
              endMonth={windowEnd}
              showOutsideDays
            />
          </div>

          <div className="flex-1 space-y-5 min-w-0">
            <div>
              <h2 className="font-medium">Giorni chiusi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Clicca un giorno per chiuderlo, riclicca per riaprirlo. Nei giorni chiusi
                non compare nessuno slot prenotabile.
              </p>
            </div>

            {selectedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nessuna chiusura in programma.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedDates.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 border border-border px-3 py-1 text-xs"
                  >
                    <CalendarOff className="w-3 h-3 text-muted-foreground" />
                    {formatLong(fromDateString(date))}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="closure-note" className="text-sm font-medium">
                Nota <span className="text-muted-foreground font-normal">(facoltativa)</span>
              </label>
              <input
                id="closure-note"
                type="text"
                value={note}
                maxLength={100}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ferie, chiusura straordinaria…"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Vale per i giorni aggiunti ora. Quelli già salvati mantengono la loro nota.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-muted/20 border-t border-border flex justify-end">
          <Button onClick={handleSave} disabled={mutation.isPending} className="w-full sm:w-auto">
            {mutation.isPending ? "Salvataggio..." : "Salva le modifiche"}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        title="Hai già prenotazioni in queste date"
      >
        <div className="space-y-4">
          <ul className="space-y-2">
            {conflicts.map((booking) => (
              <li key={booking.id} className="text-sm flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">
                  {formatLong(new Date(booking.date))}{" "}
                  {new Date(booking.date).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-medium truncate">{booking.client_name}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            Chiudere questi giorni non cancella le prenotazioni: restano in agenda e
            avvisare i clienti resta a te. Blocca solo le prenotazioni future.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsConflictOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                setIsConflictOpen(false);
                save();
              }}
            >
              Chiudi comunque
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
