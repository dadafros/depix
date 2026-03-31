/**
 * Validation utilities for DePix
 */

/**
 * Validate a Liquid Network address format.
 * Checks prefix, character set, and length.
 * Does NOT perform bech32 checksum verification.
 * @param {string} addr
 * @returns {{ valid: boolean, error: string }}
 */
export function validateLiquidAddress(addr) {
  if (!addr || addr.length < 10) {
    return { valid: false, error: "Endereço deve ter no mínimo 10 caracteres" };
  }
  if (addr.length > 200) {
    return { valid: false, error: "Endereço muito longo (máximo 200 caracteres)" };
  }

  const bech32Prefixes = ["lq1", "ex1"];
  const base58Prefixes = ["VJL", "VTp", "VTq", "H", "G"];
  const isBech32 = bech32Prefixes.some((p) => addr.startsWith(p));
  const isBase58 = base58Prefixes.some((p) => addr.startsWith(p));

  if (!isBech32 && !isBase58) {
    return {
      valid: false,
      error:
        "Endereço Liquid inválido. Deve começar com lq1, ex1, VJL ou similar.",
    };
  }

  if (isBech32) {
    if (!/^[a-z0-9]+$/.test(addr)) {
      return { valid: false, error: "Endereço contém caracteres inválidos" };
    }
    if (addr.length < 40) {
      return { valid: false, error: "Endereço Liquid muito curto" };
    }
  }

  if (isBase58) {
    if (
      !/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(
        addr,
      )
    ) {
      return { valid: false, error: "Endereço contém caracteres inválidos" };
    }
  }

  return { valid: true, error: "" };
}

/**
 * Validate an international phone number format.
 * Requires country code (e.g. +55 for Brazil).
 * Mobile numbers must have at least 10 digits total (country + local).
 * @param {string} phone
 * @returns {{ valid: boolean, error: string }}
 */
export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");

  // Minimum: country code (1-3 digits) + local number (7+ digits) = at least 10 digits
  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      error:
        "Número inválido. Inclua o código do país (ex: +55 11 99999-9999).",
    };
  }

  // Must start with a country code (1-9, no leading zero)
  if (digits.startsWith("0")) {
    return {
      valid: false,
      error: "Inclua o código do país no início (ex: +55 para Brasil).",
    };
  }

  return { valid: true, error: "" };
}
