// Speculare a server/utils/isValidTime.js: orari HH:MM (00:00–23:59), come li
// producono gli input type="time".
export const isValidTime = (value) => {
  if (typeof value !== "string") return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
};
