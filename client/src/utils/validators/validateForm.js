// Motore di validazione condiviso dai form. Prende i dati del form e una mappa
// di regole, e ritorna gli errori (messaggi già in italiano, pronti per showError)
// insieme ai valori ripuliti da mandare all'API.
//
// Forma di una regola:
//   {
//     required: "Il nome è obbligatorio",  // stringa = campo obbligatorio, assente = opzionale
//     check: validateName,                 // uno dei validator di questa cartella
//     message: "Il nome non è valido",     // mostrato se check fallisce
//     coerce: Number,                      // opzionale, applicato al valore valido
//   }
//
// Speculare a server/utils/validateFields.js: stesse regole, stessi messaggi,
// così l'utente legge lo stesso testo prima e dopo la chiamata di rete.
export const validateForm = (data, rules) => {
  const errors = [];
  const values = {};
  const source = data && typeof data === "object" ? data : {};

  for (const [field, rule] of Object.entries(rules)) {
    const raw = source[field];
    const isEmpty =
      raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");

    if (isEmpty) {
      // Un campo opzionale vuoto non è un errore e non finisce nei valori.
      if (rule.required) errors.push(rule.required);
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : raw;

    if (!rule.check(value)) {
      errors.push(rule.message);
      continue;
    }

    values[field] = rule.coerce ? rule.coerce(value) : value;
  }

  return { errors, values };
};
