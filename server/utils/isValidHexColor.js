// Il colore del servizio arriva da un <input type="color">, che produce sempre
// un esadecimale a 6 cifre.
const isValidHexColor = (value) => {
  if (typeof value !== "string") return false;
  return /^#[0-9a-f]{6}$/i.test(value.trim());
};

module.exports = { isValidHexColor };
