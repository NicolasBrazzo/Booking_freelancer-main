// Speculare a server/utils/isValidPrice.js: numero non negativo con al massimo
// due decimali. Il conteggio dei decimali si fa sulla stringa e non con
// l'aritmetica, perché 8.20 * 100 in virgola mobile dà 819.9999… e un controllo
// numerico scarterebbe un prezzo valido.
export const isValidPrice = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return false;

  const trimmed = String(value).trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return false;

  const number = Number(trimmed.replace(",", "."));
  return Number.isFinite(number) && number <= 99999999.99;
};
