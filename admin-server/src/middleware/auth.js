// src/middleware/auth.js

// Require that an admin session exists before continuing
export function requireAdmin(req, res, next) {
  if (req.session?.admin?.email) return next();

  const nextUrl = encodeURIComponent(req.originalUrl || "/admin");
  return res.redirect("/admin?next=" + nextUrl);
}

// Attach common locals for all views (user, path, session, toast)
export function attachLocals(req, res, next) {
  res.locals.session = req.session || {};
  res.locals.path = req.path;
  res.locals.user = req.session?.admin || null;

  // ---- toast flash support ----
  if (req.session?.toast) {
    res.locals.toast = req.session.toast; // make it available to EJS
    delete req.session.toast; // one-time only
  } else {
    res.locals.toast = null;
  }

  next();
}
