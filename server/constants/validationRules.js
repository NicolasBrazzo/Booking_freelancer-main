// Regole di validazione di tutte le rotte, in un posto solo: ogni voce è una
// mappa campo → regola consumata da middleware/validate.js (vedi la forma in
// utils/validateFields.js). I messaggi sono quelli che l'utente legge.
//
// Speculare a client/src/constants/validation.js: le stesse regole vengono
// applicate nel browser prima dell'invio, così il messaggio non cambia.
const {
  validateEmail,
  validateName,
  validatePhoneNumber,
  isValidText,
  isValidDuration,
  isValidPrice,
  isValidDate,
  isValidTime,
  isValidUuid,
  isValidHexColor,
  isOneOf,
  isBoolean,
} = require("../utils/validators");

const VALID_COLORS = ["indigo", "violet", "blue", "emerald", "orange", "rose", "red", "slate"];
const VALID_LAYOUTS = ["sidebar", "centered", "minimal"];
const VALID_STATUSES = ["confirmed", "cancelled", "completed"];

// La durata di un servizio non può superare la giornata: senza tetto, un valore
// enorme finirebbe nell'aritmetica dell'orario di fine in public.controller.js.
const MAX_DURATION_MINUTES = 1440;

const uuidParamRules = {
  id: {
    required: "Identificativo mancante",
    check: isValidUuid,
    message: "Identificativo non valido",
  },
};

const bookingRules = {
  service_id: {
    required: "Seleziona un servizio",
    check: isValidUuid,
    message: "Servizio non valido",
  },
  date: {
    required: "Seleziona una data",
    check: isValidDate,
    message: "La data selezionata non è valida",
  },
  start_time: {
    required: "Seleziona un orario",
    check: isValidTime,
    message: "L'orario selezionato non è valido",
  },
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

const slotsQueryRules = {
  date: {
    required: "Seleziona una data",
    check: isValidDate,
    message: "La data selezionata non è valida",
  },
  serviceId: {
    required: "Seleziona un servizio",
    check: isValidUuid,
    message: "Servizio non valido",
  },
};

// Campi di un servizio senza obbligatorietà: l'update li accetta tutti come
// opzionali, la creazione riusa gli stessi controlli aggiungendo i required.
const serviceFields = {
  name: {
    check: (value) => isValidText(value, 2, 100),
    message: "Il nome del servizio deve avere tra 2 e 100 caratteri",
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
  description: {
    check: (value) => isValidText(value, 0, 500),
    message: "La descrizione non può superare i 500 caratteri",
  },
  color: {
    check: isValidHexColor,
    message: "Il colore deve essere un esadecimale valido (es. #3B82F6)",
  },
  is_active: {
    check: isBoolean,
    message: "Lo stato del servizio non è valido",
  },
};

const serviceCreateRules = {
  ...serviceFields,
  name: { ...serviceFields.name, required: "Il nome del servizio è obbligatorio" },
  duration_minutes: { ...serviceFields.duration_minutes, required: "La durata è obbligatoria" },
  price: { ...serviceFields.price, required: "Il prezzo è obbligatorio" },
};

const serviceUpdateRules = serviceFields;

// Tutti opzionali: la pagina Aspetto aggiorna solo colore e layout, l'onboarding
// solo i dati dell'attività. L'obbligatorietà dei campi in onboarding è imposta
// dal form, qui conta che un valore presente sia valido.
const profileRules = {
  business_name: {
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
  booking_page_color: {
    check: (value) => isOneOf(value, VALID_COLORS),
    message: "Colore della pagina non valido",
  },
  booking_page_layout: {
    check: (value) => isOneOf(value, VALID_LAYOUTS),
    message: "Layout della pagina non valido",
  },
};

// PUT /auth/profile è la rotta dell'onboarding: lì il nome dell'attività è
// l'unico campo del profilo che il form segna come obbligatorio.
const profileCreateRules = {
  ...profileRules,
  business_name: {
    ...profileRules.business_name,
    required: "Il nome dell'attività è obbligatorio",
  },
};

const waitlistRules = {
  email: {
    required: "L'email è obbligatoria",
    check: (value) => validateEmail(value) && value.length <= 254,
    message: "Inserisci un'email valida",
  },
};

const availabilityDayRules = {
  day_of_week: {
    required: "Giorno della settimana mancante",
    check: (value) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 6,
    message: "Giorno della settimana non valido",
    coerce: Number,
  },
  start_time: {
    required: "L'orario di inizio è obbligatorio",
    check: isValidTime,
    message: "L'orario di inizio non è valido",
  },
  end_time: {
    required: "L'orario di fine è obbligatorio",
    check: isValidTime,
    message: "L'orario di fine non è valido",
  },
  is_active: {
    required: "Stato del giorno mancante",
    check: isBoolean,
    message: "Lo stato del giorno non è valido",
  },
};

const bookingStatusQueryRules = {
  status: {
    check: (value) => isOneOf(value, VALID_STATUSES),
    message: "Stato prenotazione non valido",
  },
};

module.exports = {
  VALID_COLORS,
  VALID_LAYOUTS,
  VALID_STATUSES,
  MAX_DURATION_MINUTES,
  uuidParamRules,
  bookingRules,
  slotsQueryRules,
  serviceCreateRules,
  serviceUpdateRules,
  profileRules,
  profileCreateRules,
  waitlistRules,
  availabilityDayRules,
  bookingStatusQueryRules,
};
