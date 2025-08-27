// src/routes/deposits.js
import express from "express";
import { adminClient } from "../supabase.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

/** Helper: get the user's email by user_id, trying 1) dep.user_email, 2) public.users, 3) auth.users */
async function getUserEmailByUserId(dep) {
  if (dep?.user_email) return dep.user_email;

  const { data: localUser, error: localErr } = await adminClient
    .from("users")
    .select("email")
    .eq("id", dep.user_id)
    .maybeSingle();
  if (localUser?.email && !localErr) return localUser.email;

  try {
    const { data, error } = await adminClient.auth.admin.getUserById(
      dep.user_id
    );
    if (error) throw error;
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

async function listByStatus(status) {
  const { data, error } = await adminClient
    .from("deposits")
    .select(
      "id, user_id, user_email, coin, amount, txid, address_used, confirmations, status, created_at, approved_at, updated_at, plan_id"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

router.get(
  "/pending",
  asyncHandler(async (req, res) => {
    const rows = await listByStatus("pending");
    res.render("deposits/pending", {
      title: "Pending Deposits",
      rows,
      items: rows,
      active: "deposits",
      query: req.query.q || "",
      pageInfo: {},
    });
  })
);

router.get(
  "/approved",
  asyncHandler(async (req, res) => {
    const rows = await listByStatus("approved");
    res.render("deposits/approved", {
      title: "Approved Deposits",
      rows,
      items: rows,
      active: "deposits",
      query: req.query.q || "",
      pageInfo: {},
    });
  })
);

router.get(
  "/rejected",
  asyncHandler(async (req, res) => {
    const rows = await listByStatus("rejected");
    res.render("deposits/rejected", {
      title: "Rejected Deposits",
      rows,
      items: rows,
      active: "deposits",
      query: req.query.q || "",
      pageInfo: {},
    });
  })
);

router.get(
  "/all",
  asyncHandler(async (req, res) => {
    const { data, error } = await adminClient
      .from("deposits")
      .select(
        "id, user_id, user_email, coin, amount, txid, address_used, confirmations, status, created_at, approved_at, updated_at, plan_id"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.render("deposits/all", {
      title: "All Deposits",
      rows: data || [],
      items: data || [],
      active: "deposits",
      query: req.query.q || "",
      pageInfo: {},
    });
  })
);

// Approve (no wallets logic)
router.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    // fetch deposit
    const { data: dep, error: e1 } = await adminClient
      .from("deposits")
      .select("*")
      .eq("id", id)
      .single();
    if (e1 || !dep) {
      req.session.toast = { type: "error", message: "Deposit not found" };
      return res.redirect("/admin/deposits/pending");
    }

    // user email
    const userEmail = await getUserEmailByUserId(dep);
    if (!userEmail) {
      req.session.toast = { type: "error", message: "User email not found" };
      return res.redirect("/admin/deposits/pending");
    }

    // mark approved only if still pending
    const { data: updatedDep, error: e2 } = await adminClient
      .from("deposits")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single();

    if (e2 || !updatedDep) {
      req.session.toast = {
        type: "info",
        message: "Already processed or not pending.",
      };
      return res.redirect("/admin/deposits/pending");
    }

    // email user (approved) — include address_used, check result, timeout
    const base =
      process.env.PUBLIC_API_BASE ||
      `http://localhost:${process.env.PORT || 5050}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8_000);
    try {
      const r = await fetch(`${base}/api/email/deposits/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-api-key": process.env.EMAIL_API_KEY || "",
        },
        body: JSON.stringify({
          email: userEmail,
          coin: dep.coin,
          amount: dep.amount,
          id: dep.id,
          status: "approved",
          note: dep.note || null,
          updated_at: updatedDep.approved_at,
          address_used: dep.address_used || null,
        }),
        signal: ac.signal,
      });
      if (!r.ok) {
        console.error("Email endpoint returned", r.status, await r.text());
      }
    } catch (err) {
      console.error("Failed to send approval email:", err);
    } finally {
      clearTimeout(t);
    }

    req.session.toast = {
      type: "success",
      message: `Deposit #${dep.id} approved.`,
    };
    res.redirect("/admin/deposits/pending");
  })
);

// Reject (no wallets logic)
router.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    // fetch deposit
    const { data: dep, error: e1 } = await adminClient
      .from("deposits")
      .select("*")
      .eq("id", id)
      .single();
    if (e1 || !dep) {
      req.session.toast = { type: "error", message: "Deposit not found" };
      return res.redirect("/admin/deposits/pending");
    }

    // user email
    const userEmail = await getUserEmailByUserId(dep);
    if (!userEmail) {
      req.session.toast = { type: "error", message: "User email not found" };
      return res.redirect("/admin/deposits/pending");
    }

    // mark rejected only if still pending
    const { data: updatedDep, error } = await adminClient
      .from("deposits")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single();
    if (error || !updatedDep) {
      req.session.toast = {
        type: "info",
        message: "Already processed or not pending.",
      };
      return res.redirect("/admin/deposits/pending");
    }

    // email user (rejected) — include address_used, check result, timeout
    const base =
      process.env.PUBLIC_API_BASE ||
      `http://localhost:${process.env.PORT || 5050}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8_000);
    try {
      const r = await fetch(`${base}/api/email/deposits/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-api-key": process.env.EMAIL_API_KEY || "",
        },
        body: JSON.stringify({
          email: userEmail,
          coin: dep.coin,
          amount: dep.amount,
          id: dep.id,
          status: "rejected",
          note: dep.note || null,
          updated_at: updatedDep.updated_at,
          address_used: dep.address_used || null,
        }),
        signal: ac.signal,
      });
      if (!r.ok) {
        console.error("Email endpoint returned", r.status, await r.text());
      }
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    } finally {
      clearTimeout(t);
    }

    req.session.toast = {
      type: "info",
      message: `Deposit #${dep.id} rejected.`,
    };
    res.redirect("/admin/deposits/pending");
  })
);

export default router;
