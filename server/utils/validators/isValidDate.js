// Non basta il formato YYYY-MM-DD: "2024-13-45" ha la forma giusta ma non è
// una data esistente, quindi si ricostruisce la data e si confronta con l'input.
const isValidDate = (value) => {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;

  // Se il giorno non esiste (es. 31 febbraio) Date normalizza al mese dopo:
  // il round-trip non torna e la data viene scartata.
  return date.toISOString().slice(0, 10) === trimmed;
};

module.exports = { isValidDate };
