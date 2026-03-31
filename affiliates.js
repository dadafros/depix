// Affiliate program helpers — extracted for testability

import { escapeHtml } from "./utils.js";

/**
 * Generate a browser fingerprint hash (SHA-256) from hardware/browser characteristics.
 * Persists across sessions since it's derived from device properties, not storage.
 * @returns {Promise<string>} hex-encoded SHA-256 hash
 */
export async function generateFingerprint() {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
    String(navigator.hardwareConcurrency || ""),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.maxTouchPoints || 0)
  ];

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("DePix.fp" + String.fromCharCode(55357, 56489), 2, 15);
    components.push(canvas.toDataURL());
  } catch { /* canvas not available */ }

  // WebGL renderer
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch { /* webgl not available */ }

  const data = new TextEncoder().encode(components.join("|"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Capture referral code from URL hash query params and store in sessionStorage.
 * @param {string} hash - window.location.hash value
 */
export function captureReferralCode(hash) {
  const params = new URLSearchParams((hash || "").split("?")[1] || "");
  const ref = params.get("ref");
  if (ref) sessionStorage.setItem("depix-ref", ref);
}

/**
 * Get stored referral code and build registration body with optional ref and fingerprint.
 * @param {object} fields - { nome, email, whatsapp, usuario, senha }
 * @param {string} [fingerprint] - browser fingerprint hash
 * @returns {object} Registration body, with ref and fingerprint if present
 */
export function buildRegistrationBody(fields, fingerprint) {
  const ref = sessionStorage.getItem("depix-ref") || undefined;
  return { ...fields, ...(ref && { ref }), ...(fingerprint && { fingerprint }) };
}

/**
 * Clear stored referral code after successful registration.
 */
export function clearReferralCode() {
  sessionStorage.removeItem("depix-ref");
}

/**
 * Build the affiliate link URL from a referral code.
 * @param {string} referralCode
 * @returns {string}
 */
export function buildAffiliateLink(referralCode) {
  return `https://depixapp.com/#landing?ref=${referralCode}`;
}

/**
 * Generate HTML for the referrals list.
 * @param {Array} referrals - array of { nome, registeredAt }
 * @param {function} formatDateShort - date formatter
 * @returns {{ html: string, isEmpty: boolean }}
 */
export function renderReferralsHTML(referrals, formatDateShort) {
  if (!referrals || referrals.length === 0) {
    return { html: "", isEmpty: true };
  }
  const html = referrals.map(r => `
    <div class="referral-item">
      <span class="referral-name">${escapeHtml(r.nome)}</span>
      <span class="referral-date">Desde ${escapeHtml(formatDateShort(r.registeredAt))}</span>
    </div>
  `).join("");
  return { html, isEmpty: false };
}
