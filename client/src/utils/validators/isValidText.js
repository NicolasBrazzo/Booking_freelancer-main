// Speculare a server/utils/isValidText.js: i campi testuali (titoli, descrizioni,
// note) non sono nomi di persona, contengono cifre e punteggiatura, quindi si
// validano sulla lunghezza e non con validateName.
export const isValidText = (value, min, max) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
