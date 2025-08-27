// src/routes/earnings.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

const getFlash = (req) => {
  try {
    return typeof req.flash === "function"
      ? { success: req.flash("success")[0], error: req.flash("error")[0] }
      : {};
  } catch {
    return {};
  }
};
const getCsrf = (req) => {
  try {
    return typeof req.csrfToken === "function" ? req.csrfToken() : null;
  } catch {
    return null;
  }
};
const toNumber = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// GET: page
router.get("/credit", async (req, res) => {
  try {
    console.log("[earnings][GET]/credit");
    const { data: recent = [], error: rErr } = await adminClient
      .from("earnings")
      .select("id,user_email,amount,note,credited_at,created_at")
      .order("credited_at", { ascending: false })
      .limit(50);
    if (rErr) {
      console.error("[earnings] recent error:", rErr);
      throw rErr;
    }

    const { data: users = [], error: uErr } = await adminClient
      .from("profiles")
      .select("email")
      .not("email", "is", null)
      .order("email", { ascending: true });
    if (uErr) {
      console.error("[earnings] users error:", uErr);
      throw uErr;
    }

    res.render("earnings/credit", {
      title: "Credit Earnings",
      recent,
      users,
      prefill: {},
      flash: getFlash(req),
      csrfToken: getCsrf(req),
    });
  } catch (err) {
    console.error("[earnings][GET]/credit fatal:", err);
    res.status(500).send(err.message);
  }
});

// POST: create a credit
router.post("/credit", async (req, res) => {
  try {
    console.log("[earnings][POST]/credit body:", req.body);
    const { user_email, amount, note, credited_at } = req.body;

    const email = (user_email || "").trim();
    const amt = toNumber(amount);

    if (!email) {
      if (req.flash) req.flash("error", "User email is required.");
      return res.redirect("/admin/earnings/credit");
    }
    if (amt === null || amt <= 0) {
      if (req.flash) req.flash("error", "Amount must be a positive number.");
      return res.redirect("/admin/earnings/credit");
    }

    // verify email exists
    const { data: prof, error: perr } = await adminClient
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (perr) {
      console.error("[earnings] profile lookup error:", perr);
      throw perr;
    }
    if (!prof) {
      console.warn("[earnings] email not found:", email);
      if (req.flash) req.flash("error", "Email not found in profiles.");
      return res.redirect("/admin/earnings/credit");
    }

    const payload = {
      user_email: email,
      amount: amt,
      // ...existing code...
      note: (note || "").trim() || null,
      credited_at: credited_at
        ? new Date(credited_at).toISOString()
        : new Date().toISOString(),
    };

    console.log("[earnings] inserting:", payload);
    const { error: iErr } = await adminClient.from("earnings").insert(payload);
    if (iErr) {
      console.error("[earnings] insert error:", iErr);
      throw iErr;
    }

    if (req.flash) req.flash("success", "Earning credited successfully.");
    res.redirect("/admin/earnings/credit");
  } catch (err) {
    console.error("[earnings][POST]/credit fatal:", err);
    if (req.flash) req.flash("error", err.message || "Unknown error");
    res.redirect("/admin/earnings/credit");
  }
});

export default router;
