import api from "../api/client";

// Eccezioni alla disponibilità (ferie e chiusure straordinarie) in un intervallo
export const fetchExceptions = async (from, to) => {
  const res = await api.get("/api/availability/exceptions", { params: { from, to } });
  return res.data;
};

// Sostituisce le chiusure dell'intervallo con quelle passate
export const updateClosures = async ({ from, to, dates, note }) => {
  const res = await api.put("/api/availability/exceptions", { from, to, dates, note });
  return res.data;
};
