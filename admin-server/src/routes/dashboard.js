// src/routes/dashboard.js
import express from "express";
import { adminClient } from "../supabase.js";

const router = express.Router();

async function count(table, where = (q) => q) {
  const { count, error } = await where(
    adminClient.from(table).select("*", { count: "exact", head: true })
  );
  if (error) throw error;
  return count || 0;
}

async function sum(table, col, where = (q) => q) {
  const { data, error } = await where(adminClient.from(table).select(col));
  if (error) throw error;
  return (data || []).reduce((acc, r) => acc + Number(r[col] || 0), 0);
}

const usd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n || 0)
  );

router.get("/", async (req, res, next) => {
  try {
    // Users
    const [users, usersActive, usersSuspended] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.eq("status", "active")),
      count("profiles", (q) => q.neq("status", "active")),
    ]);

    // Deposits
    const [depTotal, depPendingCount, depAmount] = await Promise.all([
      count("deposits"),
      count("deposits", (q) => q.eq("status", "pending")),
      sum("deposits", "amount"),
    ]);

    // Withdrawals
    const [wdTotal, wdPendingCount, wdAmount] = await Promise.all([
      count("withdrawals"),
      count("withdrawals", (q) => q.eq("status", "pending")),
      sum("withdrawals", "amount"),
    ]);

    // Plans & earnings
    const [totalPlans, totalEarningsAmount] = await Promise.all([
      count("investment_plans"),
      sum("earnings", "amount"),
    ]);

    // Recent users (already sorted/limited)
    const { data: recentUsers = [], error: rErr } = await adminClient
      .from("profiles")
      .select("id, email, username, first_name, last_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    if (rErr) throw rErr;

    // Build plain rows for the table (no arrow funcs / template literals in EJS)
    const recentRows = recentUsers.map((u) => ({
      name:
        [u.first_name, u.last_name].filter(Boolean).join(" ") || "(no name)",
      username: u.username || "—",
      email: u.email,
      statusHtml: `<span class="chip ${
        u.status === "active"
          ? "text-green-400 border-green-400/40 bg-green-500/10"
          : "text-amber-300 border-amber-300/40 bg-amber-500/10"
      }">${u.status}</span>`,
      joined: new Date(u.created_at).toLocaleString(),
    }));

    const stats = {
      users,
      usersActive,
      usersSuspended,
      depositsTotal: depTotal,
      depositsAmount: depAmount,
      depositsPending: depPendingCount,
      withdrawalsTotal: wdTotal,
      withdrawalsAmount: wdAmount,
      withdrawalsPending: wdPendingCount,
      totalPlans,
      totalEarnings: totalEarningsAmount,
    };

    const fmt = {
      depositsAmount: usd(stats.depositsAmount),
      withdrawalsAmount: usd(stats.withdrawalsAmount),
      totalEarnings: usd(stats.totalEarnings),
    };

    res.render("dashboard/index", {
      title: "Admin Dashboard",
      active: "dashboard",
      stats,
      fmt,
      recentRows,
      user: req.user || { email: "admin" },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
