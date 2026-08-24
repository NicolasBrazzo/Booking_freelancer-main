const Availability = require("../models/availability.model");

const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Lunedì → Venerdì

async function seedDefaults(freelancerId) {
  const records = DEFAULT_DAYS.map((day) => ({
    professional_id: freelancerId,
    day_of_week: day,
    start_time: "09:00",
    end_time: "18:00",
    is_active: true,
  }));

  await Availability.replaceForProfessional(freelancerId, records);
}

module.exports = { seedDefaults };
