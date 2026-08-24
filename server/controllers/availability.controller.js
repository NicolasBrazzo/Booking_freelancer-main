const express = require("express");
const protect = require("../middleware/auth");
const { validateFields } = require("../utils/validators/validateFields");
const { availabilityDayRules } = require("../constants/validationRules");
const { findByProfessionalId, replaceForProfessional } = require("../models/availability.model");

const router = express.Router();

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

// Il body è un array di fasce orarie (un giorno a orario spezzato compare più
// volte), quindi non passa dal middleware validate (che lavora su oggetti): si
// valida ogni fascia con le stesse regole e si nomina il giorno nel messaggio,
// altrimenti l'utente non sa quale riga correggere.
const validateAvailability = (body) => {
  if (!Array.isArray(body) || body.length === 0) {
    return { error: "Nessuna disponibilità da salvare", slots: [] };
  }

  const slots = [];

  for (const item of body) {
    const { errors, values } = validateFields(item, availabilityDayRules);
    const dayName = DAY_NAMES[Number(item?.day_of_week)] || "Giorno";

    if (errors.length > 0) {
      return { error: `${dayName}: ${errors[0].toLowerCase()}`, slots: [] };
    }
    if (values.start_time >= values.end_time) {
      return { error: `${dayName}: l'orario di fine deve essere successivo a quello di inizio`, slots: [] };
    }

    slots.push(values);
  }

  // Due fasce dello stesso giorno non possono accavallarsi: ordinate per orario
  // di inizio, ognuna deve cominciare quando la precedente è finita.
  for (let day = 0; day <= 6; day++) {
    const daySlots = slots
      .filter((slot) => slot.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 1; i < daySlots.length; i++) {
      if (daySlots[i].start_time < daySlots[i - 1].end_time) {
        return { error: `${DAY_NAMES[day]}: le fasce orarie si sovrappongono`, slots: [] };
      }
    }
  }

  return { error: null, slots };
};

// GET /api/availability — Ritorna le fasce orarie della settimana
router.get("/", protect, async (req, res) => {
  try {
    const data = await findByProfessionalId(req.user.sub);
    res.json({ ok: true, data });
  } catch (error) {
    console.error("FIND AVAILABILITY ERROR:", error);
    res.status(500).json({ ok: false, error: "Errore nel recupero della disponibilità" });
  }
});

// PUT /api/availability — Sostituisce la settimana (body: array di fasce)
router.put("/", protect, async (req, res) => {
  try {
    const { error, slots } = validateAvailability(req.body);
    if (error) {
      return res.status(400).json({ ok: false, error });
    }

    // Assicura che ogni fascia abbia il professional_id corretto (quello in sessione)
    const dataToSave = slots.map((slot) => ({
      professional_id: req.user.sub,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_active: slot.is_active,
    }));

    const data = await replaceForProfessional(req.user.sub, dataToSave);
    res.json({ ok: true, data });
  } catch (error) {
    console.error("SAVE AVAILABILITY ERROR:", error);
    res.status(500).json({ ok: false, error: "Errore nel salvataggio della disponibilità" });
  }
});

module.exports = router;
