const express = require("express");
const protect = require("../middleware/auth");
const supabase = require("../config/db_connection");

const router = express.Router();

// Calcola minuti tra due stringhe HH:MM
const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Lunedì della settimana corrente (UTC)
const getWeekBounds = () => {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Dom, 1=Lun, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { monday, sunday };
};

// GET /api/stats
router.get("/", protect, async (req, res) => {
  try {
    const professionalId = req.user.sub;

    // 1. Totale prenotazioni (escluse cancellate)
    const { count: totalBookings } = await supabase
      .from("bf_bookings")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .neq("status", "cancelled");

    // 2. Incassi totali (prenotazioni passate non cancellate)
    const { data: revenueRows } = await supabase
      .from("bf_bookings")
      .select("price_booking")
      .eq("professional_id", professionalId)
      .neq("status", "cancelled")
      .lt("date", new Date().toISOString());

    const totalRevenue = (revenueRows || []).reduce(
      (sum, r) => sum + (parseFloat(r.price_booking) || 0),
      0
    );

    // 3. Occupazione settimana corrente
    const { monday, sunday } = getWeekBounds();

    const { data: weekBookings } = await supabase
      .from("bf_bookings")
      .select("date, end_date")
      .eq("professional_id", professionalId)
      .neq("status", "cancelled")
      .gte("date", monday.toISOString())
      .lte("date", sunday.toISOString());

    const bookedMinutes = (weekBookings || []).reduce((sum, b) => {
      const diff = (new Date(b.end_date) - new Date(b.date)) / 60000;
      return sum + (diff > 0 ? diff : 0);
    }, 0);

    const { data: availability } = await supabase
      .from("bf_availability")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("is_active", true);

    const availableMinutes = (availability || []).reduce((sum, a) => {
      return sum + (timeToMinutes(a.end_time) - timeToMinutes(a.start_time));
    }, 0);

    const occupancyPercent =
      availableMinutes > 0
        ? Math.round((bookedMinutes / availableMinutes) * 1000) / 10
        : null;

    // 4. Breakdown settimanale (Lun–Dom)
    const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    const weeklyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const count = (weekBookings || []).filter(
        (b) => b.date.startsWith(dateStr)
      ).length;
      weeklyBreakdown.push({
        day: DAY_LABELS[d.getUTCDay()],
        date: dateStr,
        count,
      });
    }

    // 5. Breakdown giornaliero (slot 30 min per oggi)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { data: todayBookings } = await supabase
      .from("bf_bookings")
      .select("date, end_date")
      .eq("professional_id", professionalId)
      .neq("status", "cancelled")
      .gte("date", todayStart.toISOString())
      .lte("date", todayEnd.toISOString());

    // Genera slot 30 min da 07:00 a 21:00
    const dailyBreakdown = [];
    for (let mins = 7 * 60; mins < 21 * 60; mins += 30) {
      const h = String(Math.floor(mins / 60)).padStart(2, "0");
      const m = String(mins % 60).padStart(2, "0");
      const slotTime = `${h}:${m}`;
      const slotStart = new Date(todayStart);
      slotStart.setUTCHours(Math.floor(mins / 60), mins % 60, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setUTCMinutes(slotStart.getUTCMinutes() + 30);

      const count = (todayBookings || []).filter((b) => {
        const bStart = new Date(b.date);
        return bStart >= slotStart && bStart < slotEnd;
      }).length;

      dailyBreakdown.push({ time: slotTime, count });
    }

    res.json({
      ok: true,
      data: {
        totalBookings: totalBookings || 0,
        totalRevenue,
        occupancyPercent,
        weeklyBreakdown,
        dailyBreakdown,
      },
    });
  } catch (error) {
    console.error("STATS ERROR:", error);
    res.status(500).json({ ok: false, error: "Errore nel recupero statistiche" });
  }
});

module.exports = router;
