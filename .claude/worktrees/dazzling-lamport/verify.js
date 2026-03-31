// Verify email — logic module for verification flow

const API_BASE = "https://depix-backend.vercel.app";

/**
 * Detect if a login error message indicates "email not verified".
 * Matches common Portuguese variations from the backend.
 */
export function isEmailNotVerifiedError(message) {
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return lower.includes("não verificado") || lower.includes("nao verificado");
}

/**
 * When login fails because email is not verified, store the username
 * in sessionStorage so the verify screen can use it.
 */
export function handleLoginEmailNotVerified(usuario) {
  sessionStorage.setItem("depix-verify-usuario", usuario);
}

/**
 * Validate inputs before calling the verify API.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateVerifyInput(usuario, codigo) {
  if (!usuario || typeof usuario !== "string" || !usuario.trim()) {
    return {
      valid: false,
      error: "Sessão expirada. Volte ao login e tente novamente."
    };
  }

  if (!codigo || typeof codigo !== "string" || !codigo.trim()) {
    return { valid: false, error: "Digite o código de 6 dígitos" };
  }

  if (!/^\d{6}$/.test(codigo.trim())) {
    return { valid: false, error: "O código deve ter exatamente 6 dígitos numéricos" };
  }

  return { valid: true };
}

/**
 * Resend the verification code via the backend API.
 * Returns { ok: true } on success, or { ok: false, error: string } on failure.
 */
export async function resendVerificationCode(usuario) {
  if (!usuario || typeof usuario !== "string" || !usuario.trim()) {
    return { ok: false, error: "Usuário não informado. Volte ao login e tente novamente." };
  }

  try {
    // Build headers (reuse device ID if available)
    const headers = { "Content-Type": "application/json" };
    let deviceId = localStorage.getItem("depix-device-id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("depix-device-id", deviceId);
    }
    headers["X-Device-Id"] = deviceId;

    const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
      method: "POST",
      headers,
      body: JSON.stringify({ usuario: usuario.trim() })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: data?.response?.errorMessage || "Erro ao reenviar código"
      };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Erro de conexão" };
  }
}
