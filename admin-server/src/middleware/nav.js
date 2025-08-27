// src/middleware/nav.js
export function setActiveSection(req, _res, next) {
  // Normalize once
  const p = req.path || "";

  // Map any /admin/... path to a section key
  let active = "";
  if (p.startsWith("/admin/dashboard")) active = "dashboard";
  else if (p.startsWith("/admin/deposits")) active = "deposits";
  else if (p.startsWith("/admin/withdrawals")) active = "withdrawals";
  else if (p.startsWith("/admin/plans")) active = "plans";
  else if (p.startsWith("/admin/wallets")) active = "wallets";
  else if (p.startsWith("/admin/users")) active = "users";
  else if (p.startsWith("/admin/earnings")) active = "earnings";

  // res.locals so every render can see it without passing manually
  _res.locals.active = active;
  next();
}
