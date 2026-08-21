// Speculare a server/utils/isValidDuration.js: la durata arriva dal form come
// stringa ("30"), è valida solo se rappresenta un numero intero positivo.
export const isValidDuration = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;
