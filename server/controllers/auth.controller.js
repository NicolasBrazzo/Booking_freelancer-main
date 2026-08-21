const express = require("express");
const jwt = require("jsonwebtoken");
const supabase = require("../config/db_connection");
const { google } = require("googleapis");

const Freelancer = require("../models/freelancer.model");
const protect = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { profileCreateRules } = require("../constants/validationRules");

const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/jwt");
const { createOAuth2Client, SCOPES } = require("../config/google");
const { generateUniqueSlug } = require("../utils/slug");
const { seedDefaults } = require("../utils/seedDefaults");
const { encrypt } = require("../utils/tokenEncryption");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const router = express.Router();

// ── GET /auth/google — Redirect a Google OAuth ───────────────────
router.get("/google", (req, res) => {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  res.redirect(authUrl);
});

// ── GET /auth/google/callback — Callback da Google ───────────────
router.get("/google/callback", async (req, res) => {
  const { code, error: googleError } = req.query;

  if (googleError || !code) {
    return res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
  }

  try {
    const oauth2Client = createOAuth2Client();

    // Scambia il codice per i token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Ottieni profilo utente da Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const { email, given_name, family_name, picture } = profile;

    // Cerca freelancer esistente
    let freelancer = await Freelancer.findByEmail(email);

    if (freelancer) {
      // LOGIN: aggiorna i token Google
      const updates = { google_access_token: encrypt(tokens.access_token) };
      if (tokens.refresh_token) {
        updates.google_refresh_token = encrypt(tokens.refresh_token);
      }
      await Freelancer.updateById(freelancer.id, updates);
    } else {
      // REGISTRAZIONE: crea profilo + seed data
      const slug = await generateUniqueSlug(
        given_name || "user",
        family_name || "new",
        Freelancer.findBySlug,
      );

      freelancer = await Freelancer.create({
        email,
        first_name: given_name || "",
        last_name: family_name || "",
        slug,
        profile_image: picture || null,
        google_access_token: encrypt(tokens.access_token),
        google_refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        calendar_id: "primary",
      });

      await seedDefaults(freelancer.id);
    }

    // Genera JWT
    const token = jwt.sign(
      { sub: freelancer.id, email: freelancer.email, slug: freelancer.slug },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.redirect(`${FRONTEND_URL}/dashboard?token=${token}`);
  } catch (err) {
    console.error("GOOGLE CALLBACK ERROR:", err);
    res.redirect(`${FRONTEND_URL}/?error=auth_failed`);
  }
});

// ── GET /auth/me — Profilo autenticato ───────────────────────────
router.get("/me", protect, async (req, res) => {
  try {
    const freelancer = await Freelancer.findById(req.user.sub);
    if (!freelancer) {
      return res.status(404).json({ ok: false, error: "Utente non trovato" });
    }
    return res.json({ ok: true, user: freelancer });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore recupero profilo" });
  }
});

// ── POST /auth/logout ────────────────────────────────────────────
router.post("/logout", (req, res) => {
  return res.json({ ok: true });
});

// ── PUT /auth/profile — Aggiorna profilo freelancer ─────────────
router.put("/profile", protect, validate(profileCreateRules), async (req, res) => {
  try {
    const updated = await Freelancer.updateById(req.user.sub, req.body);
    res.json({ ok: true, data: updated });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore aggiornamento profilo" });
  }
});

router.get("/firstAccess", protect, async (req, res) => {
  try {
    const freelancerId = req.user.sub;

    const { data: servicesData } = await supabase
      .from("bf_services")
      .select("*")
      .eq("professional_id", freelancerId)
      .order("created_at", { ascending: true });

    const { data: freelanceData } = await supabase
      .from("bf_freelancers")
      .select("business_name, business_type, description")
      .eq("id", freelancerId)
      .maybeSingle();

    const profileComplete =
      freelanceData?.business_name &&
      freelanceData?.business_type &&
      freelanceData?.description;

    const hasServices = servicesData && servicesData.length > 0;

    const isFirstAccess = !profileComplete || !hasServices;

    res.json({ ok: true, firstAccess: isFirstAccess });
  } catch (err) {
    console.error("FIRST ACCESS CHECK ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
