// Regole di validazione dei form, in un posto solo: ogni voce è una mappa
// campo → regola consumata da validateForm (vedi @/utils/validators/validateForm).
//
// Speculare a server/constants/validationRules.js: stesse regole e stessi
// messaggi, così l'utente legge lo stesso testo sia prima dell'invio sia se
// l'errore arriva dal backend.
//
// Deroga voluta a CLAUDE.md (un file di costanti per pagina): queste regole sono
// condivise da cinque pagine diverse, duplicarle una per pagina violerebbe il DRY.
import {
  validateEmail,
  validateName,
  validatePhoneNumber,
  isValidText,
  isValidDuration,
  isValidPrice,
  isValidDate,
} from "@/utils/validators";

export const MAX_DURATION_MINUTES = 1440;

export const bookingRules = {
  client_name: {
    required: "Il nome è obbligatorio",
    check: validateName,
    message: "Il nome può contenere solo lettere, spazi e apostrofi (almeno 2 caratteri)",
  },
  client_email: {
    required: "L'email è obbligatoria",
    check: validateEmail,
    message: "Inserisci un'email valida (es. mario@esempio.it)",
  },
  client_phone: {
    check: validatePhoneNumber,
    message: "Inserisci un numero di telefono valido (es. 333 1234567 o +39 333 1234567)",
  },
  notes: {
    check: (value) => isValidText(value, 0, 500),
    message: "Le note non possono superare i 500 caratteri",
  },
};

// Campi di un servizio senza obbligatorietà: le regole complete si compongono
// aggiungendo i required, così i controlli restano scritti una volta sola.
const serviceFields = {
  name: {
    check: (value) => isValidText(value, 2, 100),
    message: "Il nome del servizio deve avere tra 2 e 100 caratteri",
  },
  description: {
    check: (value) => isValidText(value, 0, 500),
    message: "La descrizione non può superare i 500 caratteri",
  },
  duration_minutes: {
    check: (value) => isValidDuration(value) && Number(value) <= MAX_DURATION_MINUTES,
    message: `La durata deve essere un numero di minuti tra 1 e ${MAX_DURATION_MINUTES}`,
    coerce: Number,
  },
  price: {
    check: isValidPrice,
    message: "Il prezzo deve essere un numero non negativo con al massimo due decimali",
    coerce: Number,
  },
};

export const serviceRules = {
  ...serviceFields,
  name: { ...serviceFields.name, required: "Il nome del servizio è obbligatorio" },
  duration_minutes: { ...serviceFields.duration_minutes, required: "La durata è obbligatoria" },
  price: { ...serviceFields.price, required: "Il prezzo è obbligatorio" },
};

export const profileRules = {
  business_name: {
    required: "Il nome dell'attività è obbligatorio",
    check: (value) => isValidText(value, 2, 100),
    message: "Il nome dell'attività deve avere tra 2 e 100 caratteri",
  },
  description: {
    check: (value) => isValidText(value, 0, 1000),
    message: "La descrizione non può superare i 1000 caratteri",
  },
  business_type: {
    check: (value) => isValidText(value, 0, 50),
    message: "Il tipo di attività non è valido",
  },
};

export const waitlistRules = {
  email: {
    required: "L'email è obbligatoria",
    check: (value) => validateEmail(value) && value.length <= 254,
    message: "Inserisci un'email valida",
  },
};

// Chiusure straordinarie: il salvataggio ha semantica "in questo intervallo le
// chiusure sono esattamente queste", quindi from/to fanno parte del body.
// Il tetto sulle date evita che un payload assurdo diventi un insert enorme.
export const MAX_CLOSURE_DATES = 366;

export const closureRules = {
  from: {
    required: "Intervallo mancante",
    check: isValidDate,
    message: "L'intervallo selezionato non è valido",
  },
  to: {
    required: "Intervallo mancante",
    check: isValidDate,
    message: "L'intervallo selezionato non è valido",
  },
  // Volutamente senza required: deselezionare tutto e salvare significa
  // "riapri tutte le chiusure", ed è un'operazione legittima.
  dates: {
    check: (value) =>
      Array.isArray(value) && value.length <= MAX_CLOSURE_DATES && value.every(isValidDate),
    message: "Le date selezionate non sono valide",
  },
  note: {
    check: (value) => isValidText(value, 0, 100),
    message: "La nota non può superare i 100 caratteri",
  },
};
