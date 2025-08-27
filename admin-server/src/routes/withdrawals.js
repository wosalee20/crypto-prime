// src/routes/withdrawals.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

/** Helper: get the user's email by user_id: 1) public.users, 2) auth.users */
async function getUserEmailByUserId(user_id) {
  if (!user_id) return null;

  const { data: localUser, error: localErr } = await adminClient
    .from("users")
    .select("email")
    .eq("id", user_id)
    .maybeSingle();
  if (localUser?.email && !localErr) return localUser.email;

  try {
    const { data, error } = await adminClient.auth.admin.getUserById(user_id);
    if (error) throw error;
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

async function listByStatus(status) {
  const { data, error } = await adminClient
    .from("withdrawals")
    .select(
      "id, user_id, coin, amount, fee, to_address, status, created_at, processed_at, txid"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

router.get("/pending", async (req, res) => {
  const rows = await listByStatus("pending");
  res.render("withdrawals/pending", {
    title: "Pending Withdrawals",
    rows,
    items: rows,
    active: "withdrawals",
    query: req.query.q || "",
    pageInfo: {},
  });
});

router.get("/approved", async (req, res) => {
  const rows = await listByStatus("approved");
  res.render("withdrawals/approved", {
    title: "Approved Withdrawals",
    rows,
    items: rows,
    active: "withdrawals",
    query: req.query.q || "",
    pageInfo: {},
  });
});

router.get("/rejected", async (req, res) => {
  const rows = await listByStatus("rejected");
  res.render("withdrawals/rejected", {
    title: "Rejected Withdrawals",
    rows,
    items: rows,
    active: "withdrawals",
    query: req.query.q || "",
    pageInfo: {},
  });
});

router.get("/all", async (req, res) => {
  const { data, error } = await adminClient
    .from("withdrawals")
    .select(
      "id, user_id, coin, amount, fee, to_address, status, created_at, processed_at, txid"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.render("withdrawals/all", {
    title: "All Withdrawals",
    rows: data || [],
    items: data || [],
    active: "withdrawals",
    query: req.query.q || "",
    pageInfo: {},
  });
});

// Approve -> subtract from wallet, set approved + email user
router.post("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);

  // fetch withdrawal
  const { data: wd, error: e1 } = await adminClient
    .from("withdrawals")
    .select("*")
    .eq("id", id)
    .single();
  if (e1 || !wd) return res.status(400).send("Withdrawal not found");

  // prevent double-processing (only if still pending)
  if (wd.status !== "pending") {
    req.session &&
      (req.session.toast = { type: "info", message: "Already processed." });
    return res.redirect("/admin/withdrawals/pending");
  }

  // check wallet balance
  const { data: w } = await adminClient
    .from("wallets")
    .select("amount")
    .eq("user_id", wd.user_id)
    .eq("coin", wd.coin)
    .single();

  const bal = Number(w?.amount || 0);
  const needed = Number(wd.amount || 0);
  if (bal < needed) return res.status(400).send("Insufficient balance");

  // deduct
  const { error: e2 } = await adminClient.rpc("rpc_deduct_wallet", {
    p_user_id: wd.user_id,
    p_coin: wd.coin,
    p_amount: needed,
  });
  if (e2) return res.status(400).send(e2.message);

  // mark approved
  const processed_at = new Date().toISOString();
  const { data: updated, error: e3 } = await adminClient
    .from("withdrawals")
    .update({ status: "approved", processed_at })
    .eq("id", id)
    .select()
    .single();
  if (e3) return res.status(400).send(e3.message);

  // email user (approved)
  try {
    const userEmail = await getUserEmailByUserId(wd.user_id);
    if (userEmail) {
      const base =
        process.env.PUBLIC_API_BASE ||
        `http://localhost:${process.env.PORT || 5050}`;
      await fetch(`${base}/api/email/withdrawals/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-api-key": process.env.EMAIL_API_KEY || "",
        },
        body: JSON.stringify({
          email: userEmail,
          coin: wd.coin,
          amount: wd.amount,
          id: wd.id,
          status: "approved",
          updated_at: processed_at,
          to_address: wd.to_address || null,
          fee: wd.fee || 0,
          txid: updated?.txid || null,
        }),
      });
    }
  } catch (err) {
    console.error("withdrawal approved email failed:", err);
  }

  req.session &&
    (req.session.toast = {
      type: "success",
      message: `Withdrawal #${wd.id} approved.`,
    });
  res.redirect("/admin/withdrawals/pending");
});

// Reject -> mark rejected + email user
router.post("/:id/reject", async (req, res) => {
  const id = Number(req.params.id);

  // fetch withdrawal
  const { data: wd, error: e1 } = await adminClient
    .from("withdrawals")
    .select("*")
    .eq("id", id)
    .single();
  if (e1 || !wd) return res.status(400).send("Withdrawal not found");

  // mark rejected
  const { data: updated, error } = await adminClient
    .from("withdrawals")
    .update({ status: "rejected", processed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(400).send(error.message);

  // email user (rejected)
  try {
    const userEmail = await getUserEmailByUserId(wd.user_id);
    if (userEmail) {
      const base =
        process.env.PUBLIC_API_BASE ||
        `http://localhost:${process.env.PORT || 5050}`;
      await fetch(`${base}/api/email/withdrawals/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-email-api-key": process.env.EMAIL_API_KEY || "",
        },
        body: JSON.stringify({
          email: userEmail,
          coin: wd.coin,
          amount: wd.amount,
          id: wd.id,
          status: "rejected",
          updated_at: updated?.processed_at || new Date().toISOString(),
          to_address: wd.to_address || null,
          fee: wd.fee || 0,
          txid: updated?.txid || null,
        }),
      });
    }
  } catch (err) {
    console.error("withdrawal rejected email failed:", err);
  }

  req.session &&
    (req.session.toast = {
      type: "info",
      message: `Withdrawal #${wd.id} rejected.`,
    });
  res.redirect("/admin/withdrawals/pending");
});

export default router;
