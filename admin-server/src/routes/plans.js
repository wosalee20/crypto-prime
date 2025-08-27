// src/routes/plans.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

// Helpers
function toNumber(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toBool(v) {
  // supports "true"/"false", true/false, "on" (checkbox), etc.
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (s === "true" || s === "on" || s === "1") return true;
    if (s === "false" || s === "off" || s === "0") return false;
  }
  return Boolean(v);
}

// List plans
router.get("/", async (req, res) => {
  const { data = [], error } = await adminClient
    .from("investment_plans")
    .select("*")
    .order("min_amount", { ascending: true });

  if (error) return res.status(500).send(error.message);

  res.render("plans/index", {
    title: "Investment Plans",
    rows: data,
    error: "",
    active: "plans",
  });
});

// Create plan
router.post("/", async (req, res) => {
  const {
    name,
    percentage, // <--- use 'percentage' to match your EJS form
    min_amount,
    max_amount,
    duration_days,
    duration_hours,
    badge,
    key,
    sort_order,
    is_active,
  } = req.body;

  const payload = {
    name: (name || "").trim(),
    percentage: toNumber(percentage),
    min_amount: toNumber(min_amount),
    max_amount: toNumber(max_amount),
    duration_days: toNumber(duration_days),
    duration_hours: toNumber(duration_hours),
    badge: badge ? String(badge).trim() : null,
    key: key ? String(key).trim() : null,
    sort_order: toNumber(sort_order),
    is_active: toBool(is_active),
  };

  // Basic validation
  if (!payload.name || payload.percentage === null) {
    return res.status(400).send("Name and percentage are required.");
  }

  const { error } = await adminClient.from("investment_plans").insert(payload);
  if (error) return res.status(400).send(error.message);

  res.redirect("/admin/plans");
});

// Edit page
router.get("/edit/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await adminClient
    .from("investment_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return res.status(404).render("errors/404", { message: "Plan not found" });
  }

  res.render("plans/edit", {
    title: "Edit Plan",
    plan: data,
    active: "plans",
  });
});

// Update plan
router.post("/edit/:id", async (req, res) => {
  const { id } = req.params;

  const {
    name,
    percentage,
    min_amount,
    max_amount,
    duration_days,
    duration_hours,
    badge,
    key,
    sort_order,
    is_active,
  } = req.body;

  const payload = {
    name: (name || "").trim(),
    percentage: toNumber(percentage),
    min_amount: toNumber(min_amount),
    max_amount: toNumber(max_amount),
    duration_days: toNumber(duration_days),
    duration_hours: toNumber(duration_hours),
    badge: badge ? String(badge).trim() : null,
    key: key ? String(key).trim() : null,
    sort_order: toNumber(sort_order),
    is_active: toBool(is_active),
  };

  if (!payload.name || payload.percentage === null) {
    return res.status(400).send("Name and percentage are required.");
  }

  const { error } = await adminClient
    .from("investment_plans")
    .update(payload)
    .eq("id", id);

  if (error) return res.status(400).send(error.message);

  res.redirect("/admin/plans");
});

// Delete plan
router.post("/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send("Missing plan id");

  const { error } = await adminClient
    .from("investment_plans")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).send(error.message);

  res.redirect("/admin/plans");
});

export default router;
