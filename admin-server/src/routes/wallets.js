// src/routes/wallets.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

function getCsrf(req) {
  try {
    return typeof req.csrfToken === "function" ? req.csrfToken() : null;
  } catch {
    return null;
  }
}

function getFlash(req) {
  try {
    if (typeof req.flash === "function") {
      return {
        success: req.flash("success")[0],
        error: req.flash("error")[0],
      };
    }
    return {};
  } catch {
    return {};
  }
}

// List + Create screen
router.get("/company", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let query = adminClient
      .from("company_deposit_wallets")
      .select("*")
      .order("coin", { ascending: true });

    if (q) {
      query = query.or(
        `coin.ilike.%${q}%,label.ilike.%${q}%,address.ilike.%${q}%,memo_tag.ilike.%${q}%`
      );
    }

    const { data = [], error } = await query;
    if (error) throw error;

    res.render("wallets/company", {
      title: "Company Wallets",
      rows: data,
      query: q,
      editing: null,
      flash: getFlash(req),
      csrfToken: getCsrf(req),
      pageInfo: null,
      active: "wallets",
      error: "",
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Create
router.post("/company", async (req, res) => {
  try {
    let { coin, address, memo_tag, label } = req.body;
    const is_active = !!req.body.is_active;
    const is_default = !!req.body.is_default;

    coin = (coin || "").trim().toUpperCase();
    if (!coin || !address) {
      if (req.flash) req.flash("error", "Coin and Address are required.");
      return res.redirect("/admin/wallets/company");
    }

    const { error } = await adminClient.from("company_deposit_wallets").insert({
      coin,
      address,
      memo_tag: memo_tag ? String(memo_tag) : null,
      label: label ? String(label) : null,
      is_active,
      is_default,
    });
    if (error) throw error;

    if (is_default) {
      // ensure only one default per coin
      await adminClient
        .from("company_deposit_wallets")
        .update({ is_default: false })
        .neq("address", address)
        .eq("coin", coin);
      await adminClient
        .from("company_deposit_wallets")
        .update({ is_default: true })
        .eq("address", address)
        .eq("coin", coin);
    }

    if (req.flash) req.flash("success", "Wallet created.");
    res.redirect("/admin/wallets/company");
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/wallets/company");
  }
});

// Edit page
router.get("/company/:id/edit", async (req, res) => {
  try {
    const id = req.params.id;

    const { data: items = [], error: listErr } = await adminClient
      .from("company_deposit_wallets")
      .select("*")
      .order("coin", { ascending: true });
    if (listErr) throw listErr;

    const editing = items.find((w) => String(w.id) === String(id)) || null;
    if (!editing) {
      if (req.flash) req.flash("error", "Wallet not found.");
      return res.redirect("/admin/wallets/company");
    }

    res.render("wallets/company", {
      title: "Edit Company Wallet",
      rows: items,
      query: req.query.q || "",
      editing,
      flash: getFlash(req),
      csrfToken: getCsrf(req),
      pageInfo: null,
      active: "wallets",
      error: "",
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Update
router.post("/company/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let { coin, address, memo_tag, label } = req.body;
    const is_active = !!req.body.is_active;
    const is_default = !!req.body.is_default;

    coin = (coin || "").trim().toUpperCase();
    if (!coin || !address) {
      if (req.flash) req.flash("error", "Coin and Address are required.");
      return res.redirect("/admin/wallets/company");
    }

    const { error } = await adminClient
      .from("company_deposit_wallets")
      .update({
        coin,
        address,
        memo_tag: memo_tag ? String(memo_tag) : null,
        label: label ? String(label) : null,
        is_active,
        is_default,
      })
      .eq("id", id);

    if (error) throw error;

    if (is_default) {
      // ensure only one default per coin
      await adminClient
        .from("company_deposit_wallets")
        .update({ is_default: false })
        .neq("id", id)
        .eq("coin", coin);
      await adminClient
        .from("company_deposit_wallets")
        .update({ is_default: true })
        .eq("id", id);
    }

    if (req.flash) req.flash("success", "Wallet updated.");
    res.redirect("/admin/wallets/company");
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/wallets/company");
  }
});

// Toggle active
router.post("/company/:id/toggle", async (req, res) => {
  try {
    const id = req.params.id;

    const { data: row, error: fetchErr } = await adminClient
      .from("company_deposit_wallets")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const { error } = await adminClient
      .from("company_deposit_wallets")
      .update({ is_active: !row.is_active })
      .eq("id", id);
    if (error) throw error;

    if (req.flash) req.flash("success", "Wallet status updated.");
    res.redirect("/admin/wallets/company");
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/wallets/company");
  }
});

// Set default for coin
router.post("/company/:id/default", async (req, res) => {
  try {
    const id = req.params.id;

    const { data: row, error: fetchErr } = await adminClient
      .from("company_deposit_wallets")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const coin = (row.coin || "").trim().toUpperCase();

    await adminClient
      .from("company_deposit_wallets")
      .update({ is_default: false })
      .neq("id", id)
      .eq("coin", coin);

    const { error } = await adminClient
      .from("company_deposit_wallets")
      .update({ is_default: true })
      .eq("id", id);
    if (error) throw error;

    if (req.flash) req.flash("success", `Set default for ${coin}.`);
    res.redirect("/admin/wallets/company");
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/wallets/company");
  }
});

// Delete
router.post("/company/:id/delete", async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await adminClient
      .from("company_deposit_wallets")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (req.flash) req.flash("success", "Wallet deleted.");
    res.redirect("/admin/wallets/company");
  } catch (err) {
    if (req.flash) req.flash("error", err.message);
    res.redirect("/admin/wallets/company");
  }
});

export default router;
