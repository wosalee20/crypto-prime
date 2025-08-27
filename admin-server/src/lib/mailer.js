// src/lib/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env robustly (works even if imported before server.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// adjust if your .env is not one level above src/
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const {
  SMTP_HOST,
  SMTP_PORT = "587",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM = `"CryptoPrime" <no-reply@cryptoprime.app>`,
} = process.env;

for (const [k, v] of Object.entries({ SMTP_HOST, SMTP_USER, SMTP_PASS })) {
  if (!v) throw new Error(`Missing env: ${k}`);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // only true for 465
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text: text || html?.replace(/<[^>]+>/g, " "),
    html,
  });
}

export async function verifyTransport() {
  try {
    await transporter.verify();
    console.log("[mail] SMTP connection OK");
  } catch (err) {
    console.error("[mail] SMTP verify failed:", err?.message || err);
  }
}
