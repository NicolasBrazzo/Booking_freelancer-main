// Orari nel formato HH:MM (00:00–23:59), come sono salvati in bf_availability
// e come arrivano dagli input type="time" del client.
const isValidTime = (value) => {
  if (typeof value !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
};

module.exports = { isValidTime };
