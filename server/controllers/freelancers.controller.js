const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const { validate, validateParams } = require("../middleware/validate");
const { profileRules, uuidParamRules } = require("../constants/validationRules");
const Freelancer = require("../models/freelancer.model");

// GET /freelancers/image/:id — Ottieni immagine profilo freelancer
router.get("/image/:id", validateParams(uuidParamRules), async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerImage = await Freelancer.findById(id);
    if (!freelancerImage) {
      return res.status(404).json({ ok: false, error: "Freelancer non trovato" });
    }
    res.json({ ok: true, data: freelancerImage.profile_image });
  } catch (err) {
    console.error("GET FREELANCER IMAGE ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore recupero immagine profilo" });
  }
});

// PUT /freelancers/:id — Aggiorna profilo freelancer
router.put("/:id", protect, validateParams(uuidParamRules), validate(profileRules), async (req, res) => {
  try {
    const freelancerId = req.params.id;
    if (freelancerId !== req.user.sub) {
      return res.status(403).json({ ok: false, error: "Accesso negato" });
    }

    const updates = req.body;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "Nessun campo da aggiornare" });
    }

    const updated = await Freelancer.updateById(freelancerId, updates);
    res.json({ ok: true, data: updated });
  } catch (err) {
    console.error("UPDATE FREELANCER ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore aggiornamento profilo" });
  }
});

// POST /freelancers/code — Genera e salva un codice univoco per il freelancer
router.post("/code", protect, async (req, res) => {
  const MAX_ATTEMPTS = 5;

  try {
    const freelancerId = req.user.sub;
    const freelancer = await Freelancer.findById(freelancerId);

    let unique_freelance_code = null;
    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      const secondPart = (Math.random().toString(36) + Math.random().toString(36)).substring(2, 12);
      const candidate = `${freelancer.slug}-${secondPart}`;

      const existing = await Freelancer.findByCode(candidate);
      if (!existing) {
        unique_freelance_code = candidate;
        break;
      }
      attempts++;
    }

    if (!unique_freelance_code) {
      return res.status(500).json({ ok: false, error: "Impossibile generare un codice univoco, riprova." });
    }

    const updated = await Freelancer.updateById(freelancerId, { unique_freelance_code });

    res.json({ ok: true, code: updated.unique_freelance_code });
  } catch (err) {
    console.error("CREATE CODE ERROR:", err);
    res.status(500).json({ ok: false, error: "Errore creazione codice" });
  }
});

module.exports = router;