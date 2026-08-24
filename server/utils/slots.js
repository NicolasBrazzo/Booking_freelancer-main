const Availability = require("../models/availability.model");
const Booking = require("../models/bookings.model");
const { getCalendarEvents } = require("../services/googleCalendar");

const SLOT_STEP_MINUTES = 30;

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

/**
 * Calcola gli slot disponibili per un professionista in una data specifica.
 *
 * La tabella bf_bookings usa campi timestamptz:
 *   - date     (inizio appuntamento)
 *   - end_date (fine appuntamento)
 *
 * @param {Object} professional - Oggetto freelancer completo (con google_access_token/refresh_token se connesso)
 * @returns {Array<{ start_time: string, end_time: string }>} slot in formato "HH:MM"
 */
const calculateAvailableSlots = async (professional, dateString, service) => {
  const professionalId = professional.id;
  const date = new Date(dateString + "T00:00:00");
  const dayOfWeek = date.getDay();

  // Una fascia oraria per riga: un giorno a orario spezzato ne ha più di una.
  const windows = (await Availability.findByDay(professionalId, dayOfWeek)).filter((w) => w.is_active);
  if (windows.length === 0) return [];

  // findByDateRange filtra per date >= startDate e date <= endDate
  // Passiamo inizio e fine giornata come timestamptz
  const dayStart = `${dateString}T00:00:00`;
  const dayEnd = `${dateString}T23:59:59`;
  const bookings = await Booking.findByDateRange(professionalId, dayStart, dayEnd);

  const duration = service.duration_minutes;

  // Generate candidate slots, una finestra alla volta: così la pausa fra due
  // fasce non produce candidati e un servizio non può sforare la chiusura.
  const candidates = [];
  for (const window of windows) {
    const startMin = timeToMinutes(window.start_time);
    const endMin = timeToMinutes(window.end_time);
    for (let cursor = startMin; cursor + duration <= endMin; cursor += SLOT_STEP_MINUTES) {
      candidates.push({ start: cursor, end: cursor + duration });
    }
  }

  // Map existing bookings (timestamptz) to minutes-of-day
  const bookedRanges = bookings.map((b) => {
    const bStart = new Date(b.date);
    const bEnd = new Date(b.end_date);
    return {
      start: bStart.getHours() * 60 + bStart.getMinutes(),
      end: bEnd.getHours() * 60 + bEnd.getMinutes(),
    };
  });

  // Fetch Google Calendar events and map to minutes-of-day
  let calendarRanges = [];
  if (professional.google_access_token && professional.google_refresh_token) {
    try {
      const events = await getCalendarEvents(professional, dayStart, dayEnd);
      calendarRanges = events.map((e) => {
        const eStart = new Date(e.start);
        const eEnd = new Date(e.end);
        return {
          start: eStart.getHours() * 60 + eStart.getMinutes(),
          end: eEnd.getHours() * 60 + eEnd.getMinutes(),
        };
      });
    } catch (err) {
      console.error("GOOGLE CALENDAR FETCH ERROR in calculateAvailableSlots:", err);
    }
  }

  // Filter out slots overlapping with bookings or Google Calendar events
  const allBlocked = [...bookedRanges, ...calendarRanges];
  const free = candidates.filter((slot) =>
    !allBlocked.some((b) => slot.start < b.end && slot.end > b.start)
  );

  // If today, filter out past slots
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (dateString === todayStr) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return free
      .filter((slot) => slot.start > nowMin)
      .map((slot) => ({ start_time: minutesToTime(slot.start), end_time: minutesToTime(slot.end) }));
  }

  return free.map((slot) => ({
    start_time: minutesToTime(slot.start),
    end_time: minutesToTime(slot.end),
  }));
};

module.exports = { calculateAvailableSlots };
