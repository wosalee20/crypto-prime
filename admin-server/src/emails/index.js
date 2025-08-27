// /src/emails/index.js
import { sendMail } from "../lib/mailer.js";

/* --------------------------------------------------------------------------
   Brand + Email Theme
   -------------------------------------------------------------------------- */
const BRAND = {
  name: "CryptoPrime",
  primary: "#FF8A00", // orange-brown accent
  primaryText: "#FF8A00",
  text: "#EAEAEA",
  dim: "#B5B5B5",
  bg: "#0B0B0B", // deep black background
  card: "#111111", // email body container
  border: "#222222",
};

// ❌ Removed HEADER_URL
const DASHBOARD_URL = "https://cyptoprime.online/login"; // 👈 update to your dashboard URL
const ADMIN_URL = "https://cyptoprime.online/admin"; // 👈 update to your admin URL

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function ucfirst(s = "") {
  return String(s || "").replace(/^([a-z])/, (m) => m.toUpperCase());
}
function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function dateish(ts) {
  try {
    return new Date(ts || Date.now()).toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}
function code(v) {
  return `<code style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background:#181818; color:${BRAND.text}; padding:2px 6px; border-radius:4px; border:1px solid ${BRAND.border};">${v}</code>`;
}

/* --------------------------------------------------------------------------
   Email Shell – text-only header at the very first top (no image)
   -------------------------------------------------------------------------- */
function renderEmail({
  subject,
  preheader = "",
  title = "",
  lead = "",
  content = "",
  cta,
  footerNote,
}) {
  const btn = cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0">
        <tr>
          <td align="center" bgcolor="${BRAND.primary}" style="border-radius:12px">
            <a href="${cta.href}" style="display:inline-block; padding:12px 20px; font-weight:600; text-decoration:none; color:#0B0B0B; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; border-radius:12px;">
              ${cta.label}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <style>
      a { color: ${BRAND.primaryText}; }
      @media (prefers-color-scheme: dark) {
        body { background: ${BRAND.bg} !important; color: ${
    BRAND.text
  } !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};">
    <!-- Preheader (hidden in most clients) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; height:0; width:0;">
      ${preheader}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${
      BRAND.bg
    }">
      <tr>
        <td align="center">

          <!-- TOP HEADER (text-only at the very first top) -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;">
            <tr>
              <td align="center" style="padding:20px 16px 10px;">
                <div style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; font-weight:800; letter-spacing:.2px; font-size:20px; color:${
                  BRAND.primaryText
                };">
                  ${BRAND.name}
                </div>
                <div style="height:10px;"></div>
                <div style="height:1px; background:${
                  BRAND.border
                }; width:100%;"></div>
              </td>
            </tr>
          </table>

          <!-- Card / body -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; background:${
            BRAND.card
          }; border:1px solid ${
    BRAND.border
  }; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                ${
                  title
                    ? `<h1 style="margin:0 0 8px; font-size:22px; line-height:1.25; font-weight:700; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">${title}</h1>`
                    : ""
                }

                ${
                  lead
                    ? `<p style="margin:0 0 18px; color:${BRAND.dim}; font-size:14px; line-height:1.6; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">${lead}</p>`
                    : ""
                }

                <div style="font-size:15px; line-height:1.7; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
                  ${content}
                </div>

                ${btn}
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; margin:14px 0 32px;">
            <tr>
              <td align="center" style="color:${
                BRAND.dim
              }; font-size:12px; font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
                ${
                  footerNote ||
                  `${BRAND.name} • Secure digital asset management`
                }
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* --------------------------------------------------------------------------
   TEMPLATES
   -------------------------------------------------------------------------- */

/** WELCOME */
export async function sendWelcomeEmail({ email, first_name }) {
  const name = first_name ? ` ${first_name}` : "";
  const subject = "Welcome to CryptoPrime";
  const html = renderEmail({
    subject,
    preheader: `Your ${BRAND.name} account is ready.`,
    title: `Welcome${name} 👋`,
    lead: "You're all set to start depositing and tracking your earnings.",
    content: `
      <p>Hi${name},</p>
      <p>Thanks for joining <b>${BRAND.name}</b>. Your dashboard gives you a real-time view of balances, deposits, and withdrawals—designed for clarity and speed.</p>
      <ul style="margin:0 0 14px 18px; padding:0;">
        <li>Secure multi-asset support</li>
        <li>Clear, real-time transaction status</li>
        <li>Priority support when you need it</li>
      </ul>
      <p>Need help? Just reply to this email—we're here.</p>
    `,
    cta: { href: DASHBOARD_URL, label: "Open my dashboard" },
  });

  await sendMail({ to: email, subject, html, text: `Welcome${name}` });
}

/** USER: DEPOSIT PENDING */
export async function sendDepositPendingEmail({
  email,
  coin,
  amount,
  id,
  created_at,
}) {
  const subject = "Deposit received — pending confirmation";
  const html = renderEmail({
    subject,
    preheader: `We received your ${coin} deposit. It's being reviewed.`,
    title: "Deposit Pending",
    lead: "We’ve received your request and it’s moving through our confirmation checks.",
    content: `
      <p>We’ll email you as soon as this deposit is approved or rejected.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:14px 0; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Created:</b> ${dateish(created_at)}</div>
            </div>
          </td>
        </tr>
      </table>
      <p>If you didn’t make this request, please reply immediately.</p>
    `,
    cta: { href: `${DASHBOARD_URL}/deposits/${id}`, label: "View deposit" },
  });

  await sendMail({ to: email, subject, html });
}

/** USER: DEPOSIT STATUS (approved/rejected) */
export async function sendDepositStatusEmail({
  email,
  coin,
  amount,
  id,
  status,
  updated_at,
  note,
  address_used,
}) {
  const pretty = ucfirst(status);
  const subject = `Deposit ${pretty}`;
  const html = renderEmail({
    subject,
    preheader: `Your ${coin} deposit is ${pretty.toLowerCase()}.`,
    title: `Deposit ${pretty}`,
    lead:
      status === "approved"
        ? "Your deposit has been approved and added to your balance."
        : "Your deposit was not approved.",
    content: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:2px 0 14px; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Updated:</b> ${dateish(updated_at)}</div>
              ${
                address_used
                  ? `<div><b>Address:</b> ${code(address_used)}</div>`
                  : ""
              }
            </div>
          </td>
        </tr>
      </table>
      ${note ? `<p><b>Note:</b> ${note}</p>` : ""}
      <p>You can view the full details in your dashboard.</p>
    `,
    cta: { href: `${DASHBOARD_URL}/deposits/${id}`, label: "View deposit" },
  });

  await sendMail({ to: email, subject, html });
}

/** ADMIN: NEW DEPOSIT ALERT */
export async function sendAdminDepositAlertEmail({
  admin_to,
  user_email,
  coin,
  amount,
  id,
  created_at,
  address_used,
}) {
  if (!admin_to) return;
  const subject = `New deposit — #${id} (${coin} $${money(amount)})`;
  const html = renderEmail({
    subject,
    preheader: `New deposit submitted by ${user_email}`,
    title: "New Deposit Submitted",
    lead: "Review the submission and take the next action.",
    content: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:2px 0 14px; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>User:</b> ${user_email}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Address:</b> ${
                address_used ? code(address_used) : "—"
              }</div>
              <div><b>Created:</b> ${dateish(created_at)}</div>
            </div>
          </td>
        </tr>
      </table>
    `,
    cta: {
      href: `${ADMIN_URL}/deposits?status=pending&id=${encodeURIComponent(id)}`,
      label: "Open Admin → Deposits",
    },
    footerNote: `${BRAND.name} Admin Notification`,
  });

  await sendMail({ to: admin_to, subject, html });
}

/* ========================= WITHDRAWALS ========================= */

/** USER: WITHDRAWAL PENDING */
export async function sendWithdrawalPendingEmail({
  email,
  coin,
  amount,
  id,
  created_at,
  to_address,
  fee,
}) {
  const subject = "Withdrawal received — pending approval";
  const html = renderEmail({
    subject,
    preheader: `Your ${coin} withdrawal is pending review.`,
    title: "Withdrawal Pending",
    lead: "We’ve received your request and will notify you after review.",
    content: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:2px 0 14px; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Fee:</b> $${money(fee || 0)}</div>
              <div><b>To:</b> ${to_address ? code(to_address) : "—"}</div>
              <div><b>Created:</b> ${dateish(created_at)}</div>
            </div>
          </td>
        </tr>
      </table>
      <p>If you didn’t make this request, reply to this email immediately.</p>
    `,
    cta: {
      href: `${DASHBOARD_URL}/withdrawals/${id}`,
      label: "View withdrawal",
    },
  });

  await sendMail({ to: email, subject, html });
}

/** USER: WITHDRAWAL STATUS (approved/rejected) */
export async function sendWithdrawalStatusEmail({
  email,
  coin,
  amount,
  id,
  status,
  updated_at,
  note,
  to_address,
  txid,
  fee,
}) {
  const pretty = ucfirst(status);
  const subject = `Withdrawal ${pretty}`;
  const html = renderEmail({
    subject,
    preheader: `Your ${coin} withdrawal is ${pretty.toLowerCase()}.`,
    title: `Withdrawal ${pretty}`,
    lead:
      status === "approved"
        ? "Your withdrawal has been processed."
        : "Your withdrawal was not approved.",
    content: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:2px 0 14px; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Fee:</b> $${money(fee || 0)}</div>
              <div><b>To:</b> ${to_address ? code(to_address) : "—"}</div>
              <div><b>Updated:</b> ${dateish(updated_at)}</div>
              ${txid ? `<div><b>TXID:</b> ${code(txid)}</div>` : ""}
            </div>
          </td>
        </tr>
      </table>
      ${note ? `<p><b>Note:</b> ${note}</p>` : ""}
      <p>You can view the full details in your dashboard.</p>
    `,
    cta: {
      href: `${DASHBOARD_URL}/withdrawals/${id}`,
      label: "View withdrawal",
    },
  });

  await sendMail({ to: email, subject, html });
}

/** ADMIN: NEW WITHDRAWAL ALERT */
export async function sendAdminWithdrawalAlertEmail({
  admin_to,
  user_email,
  coin,
  amount,
  id,
  created_at,
  to_address,
  fee,
}) {
  if (!admin_to) return;
  const subject = `New withdrawal — #${id} (${coin} $${money(amount)})`;
  const html = renderEmail({
    subject,
    preheader: `New withdrawal requested by ${user_email}`,
    title: "New Withdrawal Submitted",
    lead: "Review and take action.",
    content: `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:2px 0 14px; border-collapse:separate; border-spacing:0;">
        <tr>
          <td style="padding:10px 12px; border:1px solid ${
            BRAND.border
          }; border-radius:10px; background:#0F0F0F;">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:14px;">
              <div><b>ID:</b> ${code(`#${id}`)}</div>
              <div><b>User:</b> ${user_email}</div>
              <div><b>Coin:</b> ${coin}</div>
              <div><b>Amount:</b> $${money(amount)}</div>
              <div><b>Fee:</b> $${money(fee || 0)}</div>
              <div><b>To:</b> ${to_address ? code(to_address) : "—"}</div>
              <div><b>Created:</b> ${dateish(created_at)}</div>
            </div>
          </td>
        </tr>
      </table>
    `,
    cta: {
      href: `${ADMIN_URL}/withdrawals?status=pending&id=${encodeURIComponent(
        id
      )}`,
      label: "Open Admin → Withdrawals",
    },
    footerNote: `${BRAND.name} Admin Notification`,
  });

  await sendMail({ to: admin_to, subject, html });
}
