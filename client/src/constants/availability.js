export const DAYS_OF_WEEK = [
  { id: 1, label: "Lunedì" },
  { id: 2, label: "Martedì" },
  { id: 3, label: "Mercoledì" },
  { id: 4, label: "Giovedì" },
  { id: 5, label: "Venerdì" },
  { id: 6, label: "Sabato" },
  { id: 0, label: "Domenica" },
];

// Un giorno è descritto da una o più fasce orarie: una sola = orario continuato,
// due = orario spezzato. La modalità non è salvata da nessuna parte, si legge da
// quante fasce ha il giorno.
export const DEFAULT_SLOT = { start_time: "09:00", end_time: "18:00" };

export const DEFAULT_AVAILABILITY = DAYS_OF_WEEK.map((day) => ({
  day_of_week: day.id,
  is_active: day.id >= 1 && day.id <= 5, // L-V attivi, S-D inattivi
  slots: [{ ...DEFAULT_SLOT }],
}));

// Pausa inserita al centro della giornata quando si passa a orario spezzato.
export const BREAK_MINUTES = 60;

// Ripiego per le giornate troppo corte perché la pausa ci stia dentro.
export const DEFAULT_SPLIT = [
  { start_time: "09:00", end_time: "13:00" },
  { start_time: "15:00", end_time: "19:00" },
];

// Finestra su cui lavora il calendario delle chiusure: da oggi a +12 mesi.
// Il salvataggio ha semantica "in questo intervallo le chiusure sono esattamente
// queste", quindi la finestra dev'essere fissa e non legata al mese visualizzato:
// altrimenti navigare fra i mesi e salvare cancellerebbe le chiusure fuori vista.
// Le chiusure passate restano intoccate perché stanno prima dell'inizio finestra.
export const CLOSURE_WINDOW_MONTHS = 12;

export const AVAILABILITY_TABS = [
  { id: "orari", label: "Orari standard" },
  { id: "chiusure", label: "Chiusure" },
];
