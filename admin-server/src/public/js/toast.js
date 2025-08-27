// src/public/js/toast.js
// Modern Toasts (2025): ES module + Web Component

const STYLE = `
:host {
  position: fixed;
  inset: 24px 24px auto auto; /* top-right */
  z-index: 9999;
  display: grid;
  gap: 10px;
  pointer-events: none;
  font: 16px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}
.toast {
  min-width: 220px; max-width: 320px;
  padding: 14px 18px;
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.18);
  opacity: 0; transform: translateY(-12px);
  transition: opacity .28s ease, transform .28s ease;
  pointer-events: auto;
  background: #111;
}
.toast.show { opacity: 1; transform: translateY(0); }
.toast:has(button) {
  display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center;
}
.toast button {
  background: #00000022; color: #fff; border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer;
}
.toast--success { background: linear-gradient(90deg, #16a34a 0%, #22d3ee 100%); }
.toast--error   { background: linear-gradient(90deg, #dc2626 0%, #f59e42 100%); }
.toast--info    { background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%); }

@media (prefers-reduced-motion: reduce) {
  .toast { transition: none; }
}
`;

class CpToasts extends HTMLElement {
  #root = this.attachShadow({ mode: "open" });
  #style = document.createElement("style");

  constructor() {
    super();
    this.#style.textContent = STYLE;
    this.#root.append(this.#style);
  }

  /**
   * Show a toast.
   * @param {Object} opts
   * @param {"success"|"error"|"info"} [opts.type="info"]
   * @param {string} opts.message
   * @param {number} [opts.duration=3500]  // ms; 0 = persist until click
   * @param {boolean} [opts.closeable=true]
   */
  show({ type = "info", message, duration = 3500, closeable = true } = {}) {
    if (!message) return;
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span>${escapeHTML(message)}</span>${
      closeable ? `<button type="button" aria-label="Close">Close</button>` : ""
    }`;
    this.#root.append(el);
    requestAnimationFrame(() => el.classList.add("show"));

    const dismiss = () => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 280);
    };

    if (closeable)
      el.querySelector("button")?.addEventListener("click", dismiss);
    const t = duration > 0 ? setTimeout(dismiss, duration) : null;

    // Click anywhere on the toast (except button) to dismiss
    el.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON") dismiss();
    });

    return {
      dismiss,
      update(next = {}) {
        if (typeof next.message === "string") {
          el.querySelector("span").textContent = next.message;
        }
        if (typeof next.type === "string") {
          el.className = `toast toast--${next.type}`;
        }
      },
    };
  }
}

customElements.define("cp-toasts", CpToasts);

// host manager
function getHost() {
  let host = document.querySelector("cp-toasts");
  if (!host) {
    host = document.createElement("cp-toasts");
    document.body.append(host);
  }
  return host;
}

// public API (module exports)
export function toast(opts) {
  return getHost().show(opts);
}
export function toastSuccess(message, duration) {
  return toast({ type: "success", message, duration });
}
export function toastError(message, duration) {
  return toast({ type: "error", message, duration });
}
export function toastInfo(message, duration) {
  return toast({ type: "info", message, duration });
}

// boot from server JSON payload if present
function bootFromJSON() {
  const script = document.getElementById("boot-toast");
  if (!script) return;
  try {
    const payload = JSON.parse(script.textContent || "null");
    if (!payload) return;
    toast({
      type: payload.type || "info",
      message: payload.message,
      duration: payload.duration ?? 3500,
    });
  } catch {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootFromJSON, { once: true });
} else {
  bootFromJSON();
}

function escapeHTML(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
