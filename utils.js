// Pure utility functions extracted from script.js for testability

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-controlled values inside innerHTML templates.
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export const ALLOWED_QR_HOSTS = ["depix.eulen.app", "eulen.app", "api.qrserver.com"];

export function isAllowedImageUrl(url) {
  if (typeof url !== "string") return false;
  if (url.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      ALLOWED_QR_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h))
    );
  } catch {
    return false;
  }
}

export function toCents(v) {
  return Math.round(
    parseFloat(v.replace("R$", "").replace("DePix", "").replace(/\./g, "").replace(",", ".").trim()) * 100
  );
}

export function formatBRL(cents) {
  const value = (cents / 100).toFixed(2);
  const [intPart, decPart] = value.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return "R$ " + formatted + "," + decPart;
}

export function formatDePix(cents) {
  // DePix has up to 8 decimal places — show full precision, minimum 2 decimals
  let str = (cents / 100).toFixed(8).replace(/0{1,6}$/, "");
  return str.replace(".", ",") + " DePix";
}
