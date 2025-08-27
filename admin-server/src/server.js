// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import path from "path";
import { fileURLToPath } from "url";

import { attachLocals, requireAdmin } from "./middleware/auth.js";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import depositsRoutes from "./routes/deposits.js";
import withdrawalsRoutes from "./routes/withdrawals.js";
import usersRoutes from "./routes/users.js";
import plansRoutes from "./routes/plans.js";
import walletsRoutes from "./routes/wallets.js";
import earningsRoutes from "./routes/earnings.js";
import emailRoutes from "./routes/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIEWS_DIR = path.join(__dirname, "views");
const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();
app.set("trust proxy", 1);

/* --------------------------------------
   CORS — apply ONLY to /api/* endpoints
   -------------------------------------- */
const corsConfig = {
  origin: (origin, cb) => {
    // Allow no-origin (curl, server-side) and whitelisted origins
    if (!origin) return cb(null, true);
    const whitelist = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim());
    if (whitelist.includes(origin)) return cb(null, true);
    // Not an allowed origin -> respond without CORS headers (no throw/500)
    return cb(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-email-api-key",
  ],
  credentials: true,
};
app.use("/api", cors(corsConfig));
app.options("/api/*", cors(corsConfig)); // preflight for API

/* ------------------
   Views & statics
   ------------------ */
app.set("view engine", "ejs");
app.set("views", VIEWS_DIR);
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static(PUBLIC_DIR));

/* ------------------
   Parsers & logging
   ------------------ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* --------------
   Session
   -------------- */
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

/* ----------------------------
   Locals (currentUser, flash)
   ---------------------------- */
app.use(attachLocals);

/* --------------
   Health check
   -------------- */
app.get("/healthz", (_req, res) => res.type("text").send("ok"));

/* --------------
   API routes
   -------------- */
app.use("/api/email", emailRoutes);

/* --------------
   Admin routes
   -------------- */
app.use("/admin", authRoutes);
app.use("/admin/dashboard", requireAdmin, dashboardRoutes);
app.use("/admin/deposits", requireAdmin, depositsRoutes);
app.use("/admin/withdrawals", requireAdmin, withdrawalsRoutes);
app.use("/admin/users", requireAdmin, usersRoutes);
app.use("/admin/plans", requireAdmin, plansRoutes);
app.use("/admin/wallets", requireAdmin, walletsRoutes);
app.use("/admin/earnings", requireAdmin, earningsRoutes);

// Root -> admin
app.get("/", (_req, res) => res.redirect("/admin"));

/* ---- 404 (keep before error handler) ---- */
app.use((req, res) => {
  res
    .status(404)
    .render("errors/404", { title: "Not Found", path: req.originalUrl });
});

/* ---- 500 (last) ---- */
app.use((err, req, res, _next) => {
  console.error(err);
  try {
    res.status(500).render("errors/500", {
      title: "Server Error",
      message: err?.message || "Unexpected error",
      stack: process.env.NODE_ENV !== "production" ? err?.stack : null,
    });
  } catch {
    res.status(500).type("text").send("Internal Server Error");
  }
});

/* --------------
   Start
   -------------- */
const port = Number(process.env.PORT || 5050);
app.listen(port, () => {
  console.log(`Admin server running at http://localhost:${port}`);
});
