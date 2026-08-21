const express = require("express");
const { validate, validateQuery } = require("../middleware/validate");
const { bookingRules, slotsQueryRules } = require("../constants/validationRules");
const Freelancer = require("../models/freelancer.model");
const Service = require("../models/services.model");
const Booking = require("../models/bookings.model");
const { calculateAvailableSlots } = require("../utils/slots");
const { createCalendarEvent } = require("../services/googleCalendar");

const router = express.Router();

// GET /api/public/:code — Info professionista + servizi attivi
router.get("/:code", async (req, res) => {
  try {
    const freelancer = await Freelancer.findByCode(req.params.code);
    if (!freelancer) {
      return res.status(404).json({ ok: false, error: "Professionista non trovato" });
    }

    const services = await Service.findActiveByProfessionalId(freelancer.id);

    res.json({ ok: true, data: { freelancer, services } });
  } catch (err) {
    console.error("PUBLIC PROFILE ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// GET /api/public/:code/slots?date=YYYY-MM-DD&serviceId=xxx — Slot disponibili
router.get("/:code/slots", validateQuery(slotsQueryRules), async (req, res) => {
  try {
    const { date, serviceId } = req.query;

    // Check date is not in the past
    const today = new Date().toISOString().split("T")[0];
    if (date < today) {
      return res.status(400).json({ ok: false, error: "Non puoi prenotare nel passato" });
    }

    const freelancer = await Freelancer.findByCode(req.params.code);
    if (!freelancer) {
      return res.status(404).json({ ok: false, error: "Professionista non trovato" });
    }

    const service = await Service.findById(serviceId);
    if (!service || service.professional_id !== freelancer.id) {
      return res.status(404).json({ ok: false, error: "Servizio non trovato" });
    }

    // Fetch full freelancer (with Google tokens) for Calendar integration
    const fullFreelancer = await Freelancer.findById(freelancer.id);
    const slots = await calculateAvailableSlots(fullFreelancer, date, service);

    res.json({ ok: true, data: slots });
  } catch (err) {
    console.error("PUBLIC SLOTS ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// POST /api/public/:code/book — Crea prenotazione
router.post("/:code/book", validate(bookingRules), async (req, res) => {
  try {
    const { service_id, date, start_time, client_name, client_email, client_phone, notes } = req.body;

    const freelancer = await Freelancer.findByCode(req.params.code);
    if (!freelancer) {
      return res.status(404).json({ ok: false, error: "Professionista non trovato" });
    }

    const service = await Service.findById(service_id);
    if (!service || service.professional_id !== freelancer.id) {
      return res.status(404).json({ ok: false, error: "Servizio non trovato" });
    }

    // Fetch full freelancer (with Google tokens) for Calendar integration
    const fullFreelancer = await Freelancer.findById(freelancer.id);

    // Build timestamptz values for date (start) and end_date (end)
    const [h, m] = start_time.split(":").map(Number);
    const endMinutes = h * 60 + m + service.duration_minutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");

    const dateTimestamp = `${date}T${start_time}:00`;
    const endDateTimestamp = `${date}T${endH}:${endM}:00`;

    // Re-verify slot is still available (includes Google Calendar check)
    const availableSlots = await calculateAvailableSlots(fullFreelancer, date, service);
    const slotExists = availableSlots.some((s) => s.start_time === start_time);
    if (!slotExists) {
      return res.status(409).json({ ok: false, error: "Slot non più disponibile" });
    }

    const booking = await Booking.create({
      professional_id: freelancer.id,
      service_id,
      date: dateTimestamp,
      end_date: endDateTimestamp,
      client_name,
      client_email,
      client_phone: client_phone || null,
      notes: notes || null,
      status: "confirmed",
      price_booking: service.price,
    });

    // Sincronizza su Google Calendar (non blocca la prenotazione in caso di errore)
    try {
      if (fullFreelancer?.google_access_token && fullFreelancer?.google_refresh_token) {
        const eventId = await createCalendarEvent(fullFreelancer, booking, service);
        booking.google_event_id = eventId;
      }
    } catch (calErr) {
      console.error("CREATE CALENDAR EVENT ERROR:", calErr);
    }

    res.status(201).json({ ok: true, data: booking });
  } catch (err) {
    console.error("PUBLIC BOOKING ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
