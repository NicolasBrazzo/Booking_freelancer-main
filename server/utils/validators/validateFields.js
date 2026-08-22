// Motore di validazione condiviso. Prende i dati grezzi e una mappa di regole,
// e ritorna gli errori (messaggi già in italiano, pronti da mostrare) insieme
// ai valori ripuliti.
//
// Forma di una regola:
//   {
//     required: "Il nome è obbligatorio",  // stringa = campo obbligatorio, assente = opzionale
//     check: validateName,                 // uno dei validator di utils/, ritorna un booleano
//     message: "Il nome non è valido",     // mostrato se check fallisce
//     coerce: Number,                      // opzionale, applicato al valore valido
//   }
//
// Speculare a client/src/utils/validators/validateForm.js: stesse regole, stessi
// messaggi, così l'utente legge lo stesso testo prima e dopo la chiamata di rete.
const validateFields = (data, rules) => {
  const errors = [];
  const values = {};
  const source = data && typeof data === "object" ? data : {};

  for (const [field, rule] of Object.entries(rules)) {
    const raw = source[field];
    const isEmpty =
      raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");

    if (isEmpty) {
      // Un campo opzionale assente non è un errore e non finisce nei valori:
      // così un update parziale non azzera le colonne non toccate.
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

  // values contiene solo le chiavi dichiarate nelle regole: le chiavi non
  // previste vengono scartate, così un body con professional_id o id non può
  // sovrascrivere colonne che il controller assegna da sé.
  return { errors, values };
};

module.exports = { validateFields };
