// src/routes/auth.js
import express from "express";

const router = express.Router();

const DEV_ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL;
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;

// GET /admin  -> login page
router.get("/", (req, res) => {
  const next = typeof req.query.next === "string" ? req.query.next : "";
  res.render("login", {
    title: "Admin Login",
    error: null,
    email: "",
    next, // <— pass next to the template
    user: req.user || { email: "admin" },
    active: "login",
    layout: false,
  });
});

// POST /admin/login
router.post("/login", (req, res) => {
  const { email, password, next } = req.body || {};

  // super simple demo auth, replace with your real check
  if (email === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD) {
    req.session.admin = { email };
    return res.redirect(
      next && typeof next === "string" ? next : "/admin/dashboard"
    );
  }

  return res.status(401).render("login", {
    title: "Admin Login",
    error: "Invalid credentials",
    email,
    next: next || "",
    active: "login",
    layout: false,
  });
});

// POST /admin/logout
router.post("/logout", (req, res) => {
  req.session?.destroy(() => {
    res.clearCookie("connect.sid"); // adjust if your cookie name differs
    res.redirect("/admin");
  });
});

export default router;
