/**
 * Validation utilities for DePix
 */

// === Bech32/Blech32 checksum verification (Liquid addresses) ===

const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32Verify(str) {
  str = str.toLowerCase();
  const pos = str.lastIndexOf("1");
  if (pos < 1 || pos + 7 > str.length || str.length > 130) return false;
  const hrp = str.slice(0, pos);
  const dataChars = str.slice(pos + 1);
  const data = [];
  for (const c of dataChars) {
    const idx = BECH32_CHARSET.indexOf(c);
    if (idx === -1) return false;
    data.push(idx);
  }
  const c = bech32Polymod([...hrpExpand(hrp), ...data]);
  return c === 1 || c === 0x2bc830a3; // bech32 or bech32m
}

function blech32Polymod(values) {
  const GEN = [
    0x7d52fba40bd886n, 0x5e8dbf1a03950cn,
    0x1c3a3c74072a18n, 0x385d72fa0e5139n, 0x7093e5a608865bn
  ];
  let chk = 1n;
  for (const v of values) {
    const b = chk >> 55n;
    chk = ((chk & 0x7fffffffffffffn) << 5n) ^ BigInt(v);
    for (let i = 0; i < 5; i++) {
      if ((b >> BigInt(i)) & 1n) chk ^= GEN[i];
    }
  }
  return chk;
}

function blech32Verify(str) {
  str = str.toLowerCase();
  const pos = str.lastIndexOf("1");
  if (pos < 1 || pos + 13 > str.length) return false;
  const hrp = str.slice(0, pos);
  const dataChars = str.slice(pos + 1);
  const data = [];
  for (const c of dataChars) {
    const idx = BECH32_CHARSET.indexOf(c);
    if (idx === -1) return false;
    data.push(idx);
  }
  return blech32Polymod([...hrpExpand(hrp), ...data]) === 1n;
}

/**
 * Validate a Liquid Network address with full checksum verification.
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

  const lower = addr.toLowerCase();

  // Bech32 addresses (ex1 = unconfidential, lq1 = confidential)
  if (lower.startsWith("ex1") || lower.startsWith("lq1")) {
    const verify = lower.startsWith("lq1") ? blech32Verify : bech32Verify;
    if (!verify(addr)) {
      return { valid: false, error: "Endereço Liquid inválido (checksum incorreto)" };
    }
    return { valid: true, error: "" };
  }

  // Base58 addresses (legacy)
  const base58Prefixes = ["VJL", "VTp", "VTq", "H", "G"];
  const isBase58 = base58Prefixes.some((p) => addr.startsWith(p));
  if (isBase58) {
    if (
      !/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(addr)
    ) {
      return { valid: false, error: "Endereço contém caracteres inválidos" };
    }
    return { valid: true, error: "" };
  }

  return {
    valid: false,
    error: "Endereço Liquid inválido. Deve começar com lq1, ex1, VJL ou similar.",
  };
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
