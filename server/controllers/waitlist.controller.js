const express = require("express");
const { validate } = require("../middleware/validate");
const { waitlistRules } = require("../constants/validationRules");
const Waitlist = require("../models/waitlist.model");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

router.post("/", validate(waitlistRules), async (req, res) => {
  // La colonna email ha un vincolo unique: senza normalizzare il maiuscolo,
  // Foo@x.com e foo@x.com finirebbero in due righe distinte.
  const email = req.body.email.toLowerCase();
  try {
    const existing = await Waitlist.findByEmail(email);
    if (!existing) {
      await Waitlist.create(email);
      if (process.env.RESEND_API_KEY && process.env.DEVELOPER_EMAIL) {
        resend.emails
          .send({
            from: "Volta Beta <onboarding@resend.dev>",
            to: process.env.DEVELOPER_EMAIL,
            subject: `Nuova richiesta early access: ${email}`,
            text: `Email: ${email}\nData: ${new Date().toISOString()}`,
          })
          .catch((err) => console.error("RESEND ERROR:", err));
      }
    }
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("WAITLIST ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore durante la registrazione" });
  }
});

module.exports = router;
