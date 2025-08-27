// src/routes/users.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

/* ---------- helpers ---------- */
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

/* ---------- list users ---------- */
router.get("/", async (req, res) => {
  try {
    const { data = [], error } = await adminClient
      .from("profiles")
      .select("id, email, username, first_name, last_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    res.render("users/list", {
      title: "Users",
      rows: data,
      active: "users",
      currentAdmin: req.user || { email: "admin" },
      flash: getFlash(req),
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* ---------- create user (GET first, BEFORE :id) ---------- */
router.get("/create/new", (req, res) => {
  res.render("users/create", {
    title: "Create User",
    error: "",
    active: "users",
    currentAdmin: req.user || { email: "admin" },
    csrfToken: getCsrf(req),
    flash: getFlash(req),
  });
});

/* ---------- create user (POST) ---------- */
router.post("/create/new", async (req, res) => {
  try {
    const { email, password, first_name, last_name, username } = req.body;

    // 1) Create Auth user
    const { data: created, error: e1 } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (e1) throw e1;

    // 2) Upsert profile row
    const { error: e2 } = await adminClient.from("profiles").upsert({
      id: created.user.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      username: username || null,
      status: "active",
    });
    if (e2) throw e2;

    if (req.flash) req.flash("success", "User created.");
    res.redirect("/admin/users");
  } catch (e) {
    res.render("users/create", {
      title: "Create User",
      error: e.message || "Failed to create user",
      active: "users",
      currentAdmin: req.user || { email: "admin" },
      csrfToken: getCsrf(req),
      flash: getFlash(req),
    });
  }
});

/* ---------- update status ---------- */
router.post("/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body; // 'active' | 'blocked' | 'suspended'
    const { error } = await adminClient
      .from("profiles")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    if (req.flash) req.flash("success", "Status updated.");
    res.redirect("/admin/users/" + id);
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/users/" + req.params.id);
  }
});

/* ---------- user detail (GET) ---------- */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Load user
    const { data: user, error } = await adminClient
      .from("profiles")
      .select("id, email, username, first_name, last_name, status, created_at")
      .eq("id", id)
      .single();
    if (error || !user) return res.status(404).send("User not found");

    // Load this user's earnings by email (NO coin)
    const { data: earnings = [], error: eErr } = await adminClient
      .from("earnings")
      .select("id, amount, note, credited_at, created_at")
      .eq("user_email", user.email)
      .order("credited_at", { ascending: false });
    if (eErr) throw eErr;

    res.render("users/detail", {
      title: "User Detail",
      user,
      earnings,
      active: "users",
      currentAdmin: req.user || { email: "admin" },
      csrfToken: getCsrf(req),
      flash: getFlash(req),
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* ---------- add earning for a user (POST) ---------- */
router.post("/:id/earnings", async (req, res) => {
  try {
    const id = req.params.id;
    const { amount, note, credited_at } = req.body; // <-- coin removed

    // Resolve user email
    const { data: user, error: uErr } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("id", id)
      .single();
    if (uErr) throw uErr;
    if (!user) {
      if (req.flash) req.flash("error", "User not found.");
      return res.redirect(`/admin/users/${id}`);
    }

    const amt = toNumber(amount);
    if (amt === null || amt <= 0) {
      if (req.flash) req.flash("error", "Amount must be a positive number.");
      return res.redirect(`/admin/users/${id}`);
    }

    const payload = {
      user_email: (user.email || "").trim(),
      amount: amt,
      note: (note || "").trim() || null,
      credited_at: credited_at
        ? new Date(credited_at).toISOString()
        : new Date().toISOString(),
    };

    const { error: iErr } = await adminClient.from("earnings").insert(payload);
    if (iErr) throw iErr;

    if (req.flash) req.flash("success", "Earning credited successfully.");
    res.redirect(`/admin/users/${id}`);
  } catch (err) {
    if (req.flash)
      req.flash("error", err.message || "Failed to credit earning.");
    res.redirect(`/admin/users/${req.params.id}`);
  }
});

export default router;
