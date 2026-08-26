const express = require("express");
const protect = require("../middleware/auth");
const { validateFields } = require("../utils/validators/validateFields");
const { validate, validateQuery } = require("../middleware/validate");
const {
  availabilityDayRules,
  closureRules,
  closureRangeQueryRules,
} = require("../constants/validationRules");
const { findByProfessionalId, replaceForProfessional } = require("../models/availability.model");
const Exceptions = require("../models/availabilityExceptions.model");

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

// ============================================
// Eccezioni: ferie e chiusure straordinarie
// ============================================

// GET /api/availability/exceptions?from=&to= — Eccezioni nell'intervallo
router.get("/exceptions", protect, validateQuery(closureRangeQueryRules), async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await Exceptions.findByDateRange(req.user.sub, from, to);
    res.json({ ok: true, data });
  } catch (error) {
    console.error("FIND EXCEPTIONS ERROR:", error);
    res.status(500).json({ ok: false, error: "Errore nel recupero delle chiusure" });
  }
});

// PUT /api/availability/exceptions — Sostituisce le chiusure dell'intervallo
//
// Semantica replace: "in [from, to] le chiusure sono esattamente queste". Il
// client manda sempre una finestra fissa (da oggi a +12 mesi), così navigare fra
// i mesi del calendario non può cancellare chiusure fuori dalla vista, e quelle
// passate non vengono mai toccate perché stanno prima di from.
router.put("/exceptions", protect, validate(closureRules), async (req, res) => {
  try {
    const { from, to, note } = req.body;
    const dates = req.body.dates ?? [];

    if (from > to) {
      return res.status(400).json({ ok: false, error: "L'intervallo selezionato non è valido" });
    }
    if (dates.some((date) => date < from || date > to)) {
      return res.status(400).json({ ok: false, error: "Alcune date sono fuori dall'intervallo selezionato" });
    }

    const existing = await Exceptions.findByDateRange(req.user.sub, from, to);

    // Solo le chiusure di giornata intera: le righe con orari valorizzati sono
    // previste dallo schema (orario straordinario su una data) e questo endpoint
    // non deve né contarle né cancellarle.
    const closedDates = existing.filter((row) => !row.start_time).map((row) => row.date);

    const toCreate = dates.filter((date) => !closedDates.includes(date));
    const toDelete = closedDates.filter((date) => !dates.includes(date));

    // Prima si scrive, poi si cancella: un errore a metà lascia qualche chiusura
    // di troppo, mai un giorno aperto per sbaglio.
    if (toCreate.length > 0) {
      await Exceptions.createMany(
        toCreate.map((date) => ({
          professional_id: req.user.sub,
          date,
          start_time: null,
          end_time: null,
          note: note || null,
        }))
      );
    }
    if (toDelete.length > 0) {
      await Exceptions.deleteByDates(req.user.sub, toDelete);
    }

    const data = await Exceptions.findByDateRange(req.user.sub, from, to);
    res.json({ ok: true, data });
  } catch (error) {
    console.error("SAVE EXCEPTIONS ERROR:", error);
    res.status(500).json({ ok: false, error: "Errore nel salvataggio delle chiusure" });
  }
});

module.exports = router;
