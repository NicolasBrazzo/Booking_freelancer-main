const express = require("express");
const protect = require("../middleware/auth");
const { validateFields } = require("../utils/validators/validateFields");
const { availabilityDayRules } = require("../constants/validationRules");
const { findByProfessionalId, upsert } = require("../models/availability.model");

const router = express.Router();

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

// Il body è un array di giorni, quindi non passa dal middleware validate (che
// lavora su oggetti): si valida ogni elemento con le stesse regole e si
// nomina il giorno nel messaggio, altrimenti l'utente non sa quale riga correggere.
const validateAvailability = (body) => {
  if (!Array.isArray(body) || body.length === 0) {
    return { error: "Nessuna disponibilità da salvare", days: [] };
  }

  const days = [];

  for (const item of body) {
    const { errors, values } = validateFields(item, availabilityDayRules);
    const dayName = DAY_NAMES[Number(item?.day_of_week)] || "Giorno";

    if (errors.length > 0) {
      return { error: `${dayName}: ${errors[0].toLowerCase()}`, days: [] };
    }
    if (values.start_time >= values.end_time) {
      return { error: `${dayName}: l'orario di fine deve essere successivo a quello di inizio`, days: [] };
    }

    days.push(values);
  }

  return { error: null, days };
};

// GET /api/availability — Ritorna disponibilità settimanale
router.get("/", protect, async (req, res) => {
  try {
    const data = await findByProfessionalId(req.user.sub);
    res.json({ ok: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Errore nel recupero della disponibilità" });
  }
});

// PUT /api/availability — Aggiorna disponibilità (body: array di 7 giorni)
router.put("/", protect, async (req, res) => {
  try {
    const { error, days } = validateAvailability(req.body);
    if (error) {
      return res.status(400).json({ ok: false, error });
    }

    // Assicura che ogni record abbia il professional_id corretto (quello in sessione)
    const dataToSave = days.map((item) => ({
      professional_id: req.user.sub,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      is_active: item.is_active,
    }));

    const data = await upsert(dataToSave);
    res.json({ ok: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Errore nel salvataggio della disponibilità" });
  }
});

module.exports = router;
