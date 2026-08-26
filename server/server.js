require('dotenv').config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./controllers/auth.controller");
const servicesRoutes = require("./controllers/services.controller");
const availabilityRoutes = require("./controllers/availability.controller");
const bookingsRoutes = require("./controllers/bookings.controller");
const publicRoutes = require("./controllers/public.controller");
const freelancersRoutes = require("./controllers/freelancers.controller");
const waitlistRoutes = require("./controllers/waitlist.controller");
const statsRoutes = require("./controllers/stats.controller");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL
}));
// express-rate-limit risponde con un body testuale: senza questo il client
// normalizza tutto a "Errore server" invece di mostrare il motivo vero.
const tooManyRequests = { ok: false, error: "Troppe richieste. Riprova tra un minuto." };

app.use(rateLimit({ windowMs: 60_000, max: 100, message: tooManyRequests, standardHeaders: true, legacyHeaders: false }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotte autenticate
app.use("/auth", authRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/freelancers", freelancersRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/stats", statsRoutes);

// Rotte pubbliche (no auth). Una singola prenotazione fa molte GET — profilo a
// ogni step del flusso, slot a ogni cambio data — quindi il limite stretto sta
// solo sulla POST che crea la prenotazione, l'unica davvero spammabile.
const publicLimiter = rateLimit({ windowMs: 60_000, max: 60, message: tooManyRequests, standardHeaders: true, legacyHeaders: false });
const bookingLimiter = rateLimit({ windowMs: 60_000, max: 10, message: tooManyRequests, standardHeaders: true, legacyHeaders: false });

app.post("/api/public/:code/book", bookingLimiter);
app.use("/api/public", publicLimiter, publicRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Rotta non trovata" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ ok: false, error: "Errore interno del server" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend ON at port ${PORT}`);
});
