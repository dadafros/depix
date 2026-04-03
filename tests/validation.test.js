import { describe, it, expect } from "vitest";
import { validateLiquidAddress, validatePhone } from "../validation.js";

describe("validateLiquidAddress", () => {
  it("should reject empty or missing address", () => {
    expect(validateLiquidAddress("").valid).toBe(false);
    expect(validateLiquidAddress(null).valid).toBe(false);
    expect(validateLiquidAddress(undefined).valid).toBe(false);
  });

  it("should reject address shorter than 10 chars", () => {
    expect(validateLiquidAddress("lq1abc").valid).toBe(false);
  });

  it("should reject address longer than 200 chars", () => {
    expect(validateLiquidAddress("lq1" + "a".repeat(200)).valid).toBe(false);
  });

  it("should reject address with invalid prefix", () => {
    const result = validateLiquidAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("inválido");
  });

  it("should accept valid blech32 lq1 address", () => {
    const addr = "lq1qqpzry9x8gf2tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s3jn5psx4kgu9l78v";
    expect(validateLiquidAddress(addr).valid).toBe(true);
  });

  it("should accept valid bech32 ex1 address", () => {
    const addr = "ex1qqpzry9x8gf2tvdw0s3jn54khce6mua7lmkqn9x";
    expect(validateLiquidAddress(addr).valid).toBe(true);
  });

  it("should reject bech32 address with invalid checksum", () => {
    // Valid address with one character changed in the middle
    const addr = "ex1qqpzry9x8gf2tvdw0s3jn54khce6mua7lmkqn9a";
    expect(validateLiquidAddress(addr).valid).toBe(false);
    expect(validateLiquidAddress(addr).error).toContain("checksum");
  });

  it("should reject bech32 address that is too short", () => {
    const result = validateLiquidAddress("lq1abcdefghij");
    expect(result.valid).toBe(false);
  });

  it("should reject bech32 address with missing character", () => {
    // Remove a character from the middle — should fail checksum
    const valid = "ex1qqpzry9x8gf2tvdw0s3jn54khce6mua7lmkqn9x";
    const tampered = valid.slice(0, 20) + valid.slice(21);
    expect(validateLiquidAddress(tampered).valid).toBe(false);
  });

  it("should accept valid base58 VJL address", () => {
    const addr = "VJL" + "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789".slice(0, 50);
    expect(validateLiquidAddress(addr).valid).toBe(true);
  });

  it("should reject base58 address with invalid chars (0, O, I, l)", () => {
    const addr = "VJL" + "0OIl" + "a".repeat(40);
    expect(validateLiquidAddress(addr).valid).toBe(false);
  });

  it("should accept valid H prefix address", () => {
    const addr = "H" + "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789".slice(0, 30);
    expect(validateLiquidAddress(addr).valid).toBe(true);
  });

  it("should accept valid G prefix address", () => {
    const addr = "G" + "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789".slice(0, 30);
    expect(validateLiquidAddress(addr).valid).toBe(true);
  });
});

describe("validatePhone", () => {
  it("should accept Brazilian mobile with country code (+55)", () => {
    expect(validatePhone("+55 11 99999-9999").valid).toBe(true);
    expect(validatePhone("5511999999999").valid).toBe(true);
  });

  it("should accept Brazilian mobile without country code", () => {
    expect(validatePhone("11 99999-9999").valid).toBe(true);
    expect(validatePhone("11999999999").valid).toBe(true);
  });

  it("should accept US number with country code", () => {
    expect(validatePhone("+1 555 123 4567").valid).toBe(true);
  });

  it("should accept international numbers", () => {
    // Portugal
    expect(validatePhone("+351 912 345 678").valid).toBe(true);
    // UK
    expect(validatePhone("+44 7911 123456").valid).toBe(true);
  });

  it("should reject number that is too short", () => {
    const result = validatePhone("123456");
    expect(result.valid).toBe(false);
  });

  it("should reject number that is too long", () => {
    const result = validatePhone("+55 11 99999 99999 99999");
    expect(result.valid).toBe(false);
  });

  it("should reject number starting with 0 (no country code)", () => {
    const result = validatePhone("011999999999");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("código do país");
  });

  it("should strip formatting characters", () => {
    expect(validatePhone("+55 (11) 99999-9999").valid).toBe(true);
    expect(validatePhone("+55-11-99999-9999").valid).toBe(true);
  });
});
