import { describe, it, expect, beforeEach, vi } from "vitest";

// ===== DOM + storage mocks =====
const store = {};
const sessionStore = {};

const localStorageMock = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; }
};

const sessionStorageMock = {
  getItem: (key) => sessionStore[key] ?? null,
  setItem: (key, value) => { sessionStore[key] = String(value); },
  removeItem: (key) => { delete sessionStore[key]; },
  clear: () => { for (const k in sessionStore) delete sessionStore[k]; }
};

Object.defineProperty(global, "localStorage", { value: localStorageMock });
Object.defineProperty(global, "sessionStorage", { value: sessionStorageMock });

// ===== Tests =====

describe("Bug 1: Login 'email not verified' should offer path to verify screen", () => {
  /**
   * Regression: After registration + successful verification, the user goes to login.
   * If the backend still says "email not verified", the login screen MUST show a link
   * to the verify screen so the user can re-verify. Previously, the user was stuck
   * on the login screen with no way to proceed.
   */

  it("should store username in sessionStorage when login returns 'email not verified'", async () => {
    // Dynamically import after mocks are set up
    const { handleLoginEmailNotVerified } = await import("../verify.js");

    sessionStorageMock.clear();
    handleLoginEmailNotVerified("dada");

    expect(sessionStorageMock.getItem("depix-verify-usuario")).toBe("dada");
  });

  it("should detect 'email not verified' error messages in Portuguese", async () => {
    const { isEmailNotVerifiedError } = await import("../verify.js");

    expect(isEmailNotVerifiedError("Email ainda não verificado. Verifique sua caixa de entrada.")).toBe(true);
    expect(isEmailNotVerifiedError("Email não verificado")).toBe(true);
    expect(isEmailNotVerifiedError("e-mail não verificado")).toBe(true);
    expect(isEmailNotVerifiedError("Senha incorreta")).toBe(false);
    expect(isEmailNotVerifiedError("Erro ao fazer login")).toBe(false);
    expect(isEmailNotVerifiedError("")).toBe(false);
    expect(isEmailNotVerifiedError(null)).toBe(false);
    expect(isEmailNotVerifiedError(undefined)).toBe(false);
  });
});

describe("Bug 2: Resend verification code", () => {
  /**
   * Regression: The verify screen had no "Resend code" button at all.
   * Users who didn't receive the email had no way to request a new code.
   */

  let fetchMock;

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  it("should call the resend-verification API with the correct username", async () => {
    const { resendVerificationCode } = await import("../verify.js");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Código reenviado" })
    });

    const result = await resendVerificationCode("dada");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/auth/resend-verification");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.usuario).toBe("dada");
    expect(result.ok).toBe(true);
  });

  it("should return error when username is empty", async () => {
    const { resendVerificationCode } = await import("../verify.js");

    const result = await resendVerificationCode("");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error when username is null/undefined", async () => {
    const { resendVerificationCode } = await import("../verify.js");

    const result1 = await resendVerificationCode(null);
    expect(result1.ok).toBe(false);

    const result2 = await resendVerificationCode(undefined);
    expect(result2.ok).toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should handle API failure gracefully", async () => {
    const { resendVerificationCode } = await import("../verify.js");

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ response: { errorMessage: "Muitas tentativas" } })
    });

    const result = await resendVerificationCode("dada");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Muitas tentativas");
  });

  it("should handle network failure gracefully", async () => {
    const { resendVerificationCode } = await import("../verify.js");

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const result = await resendVerificationCode("dada");

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("Verify screen: input validation", () => {
  /**
   * Regression: The verify screen would call the API even when the username
   * was missing from sessionStorage (e.g., after page refresh), leading to
   * silent failures where the backend returned success but didn't verify anything.
   */

  it("should reject verification when username is empty", async () => {
    const { validateVerifyInput } = await import("../verify.js");

    const result = validateVerifyInput("", "123456");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject verification when code is empty", async () => {
    const { validateVerifyInput } = await import("../verify.js");

    const result = validateVerifyInput("dada", "");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject verification when code is not 6 digits", async () => {
    const { validateVerifyInput } = await import("../verify.js");

    expect(validateVerifyInput("dada", "123").valid).toBe(false);
    expect(validateVerifyInput("dada", "1234567").valid).toBe(false);
    expect(validateVerifyInput("dada", "abcdef").valid).toBe(false);
  });

  it("should accept valid username and 6-digit code", async () => {
    const { validateVerifyInput } = await import("../verify.js");

    const result = validateVerifyInput("dada", "123456");
    expect(result.valid).toBe(true);
  });
});
