// src/routes/email.js
import express from "express";
import cors from "cors";
import {
  sendWelcomeEmail,
  sendDepositPendingEmail,
  sendDepositStatusEmail,
  sendAdminDepositAlertEmail,
  sendWithdrawalPendingEmail,
  sendWithdrawalStatusEmail,
  sendAdminWithdrawalAlertEmail,
} from "../emails/index.js";

const router = express.Router();

// Optional shared secret
function checkKey(req, res, next) {
  const want = process.env.EMAIL_API_KEY;
  if (!want) return next();
  const got = req.get("x-email-api-key") || req.query.key;
  if (got && got === want) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// Preflight
router.options("/welcome", cors());
router.options("/deposits/pending", cors());
router.options("/deposits/status", cors());
router.options("/withdrawals/pending", cors());
router.options("/withdrawals/status", cors());

// Welcome
router.post("/welcome", checkKey, async (req, res) => {
  const { email, first_name } = req.body || {};
  if (!email) return res.status(400).json({ error: "email is required" });
  await sendWelcomeEmail({ email, first_name });
  res.json({ ok: true });
});

// Deposits: User pending + Admin alert
router.post("/deposits/pending", checkKey, async (req, res) => {
  try {
    const {
      email,
      user_email_for_admin,
      coin,
      amount,
      id,
      created_at,
      address_used,
    } = req.body || {};
    if (!email || !coin || !amount || !id || !created_at) {
      return res.status(400).json({ error: "missing fields" });
    }
    await sendDepositPendingEmail({ email, coin, amount, id, created_at });

    const toList = (process.env.ADMIN_ALERT_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await Promise.all(
      toList.map((admin_to) =>
        sendAdminDepositAlertEmail({
          admin_to,
          user_email: user_email_for_admin || email,
          coin,
          amount,
          id,
          created_at,
          address_used,
        })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("pending email error:", e);
    res.status(500).json({ error: "failed_to_send" });
  }
});

// Deposits: Status change → user
router.post("/deposits/status", checkKey, async (req, res) => {
  try {
    const { email, coin, amount, id, status, note, updated_at, address_used } =
      req.body || {};
    if (!email || !coin || !amount || !id || !status) {
      return res.status(400).json({ error: "missing fields" });
    }
    await sendDepositStatusEmail({
      email,
      coin,
      amount,
      id,
      status: String(status).toLowerCase(),
      note,
      updated_at: updated_at || Date.now(),
      address_used,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("status email error:", e);
    res.status(500).json({ error: "failed_to_send" });
  }
});

/* ========================= WITHDRAWALS ========================= */

// Withdrawals: User pending + Admin alert
router.post("/withdrawals/pending", checkKey, async (req, res) => {
  try {
    const {
      email,
      user_email_for_admin,
      coin,
      amount,
      id,
      created_at,
      to_address,
      fee,
    } = req.body || {};
    if (!email || !coin || !amount || !id || !created_at) {
      return res.status(400).json({ error: "missing fields" });
    }

    await sendWithdrawalPendingEmail({
      email,
      coin,
      amount,
      id,
      created_at,
      to_address,
      fee,
    });

    const toList = (process.env.ADMIN_ALERT_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await Promise.all(
      toList.map((admin_to) =>
        sendAdminWithdrawalAlertEmail({
          admin_to,
          user_email: user_email_for_admin || email,
          coin,
          amount,
          id,
          created_at,
          to_address,
          fee,
        })
      )
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("withdrawal pending email error:", e);
    res.status(500).json({ error: "failed_to_send" });
  }
});

// Withdrawals: Status change → user
router.post("/withdrawals/status", checkKey, async (req, res) => {
  try {
    const {
      email,
      coin,
      amount,
      id,
      status,
      note,
      updated_at,
      to_address,
      txid,
      fee,
    } = req.body || {};
    if (!email || !coin || !amount || !id || !status) {
      return res.status(400).json({ error: "missing fields" });
    }
    await sendWithdrawalStatusEmail({
      email,
      coin,
      amount,
      id,
      status: String(status).toLowerCase(), // "approved" | "rejected" | maybe "completed"
      note,
      updated_at: updated_at || Date.now(),
      to_address,
      txid,
      fee,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("withdrawal status email error:", e);
    res.status(500).json({ error: "failed_to_send" });
  }
});

export default router;
