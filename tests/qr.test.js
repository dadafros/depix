// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { _generateQR, renderBrandedQr, renderPixQr } from "../qr.js";

const LIQUID_ADDR = "lq1qqvmkrx3srukzfgy5636cdastgy58ualv87fkkjl70asyps9pjr2tlanszxmwvmxqmd8a6hnkf97fumsj5ycvg476qr3vl3pzh";

function verifyFinderPattern(matrix, startRow, startCol) {
  const expected = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      expect(matrix[startRow + r][startCol + c]).toBe(expected[r][c]);
    }
  }
}

describe("_generateQR", () => {
  describe("version selection", () => {
    it("produces V1 (21x21) for short text with ECC H", () => {
      const { size } = _generateQR("AB", 3);
      expect(size).toBe(21);
    });

    it("produces a larger version for medium text with ECC H", () => {
      const text = "A".repeat(50);
      const { size } = _generateQR(text, 3);
      expect(size).toBeGreaterThan(21);
    });

    it("produces V10 (57x57) for a Liquid address with ECC H", () => {
      const { size } = _generateQR(LIQUID_ADDR, 3);
      expect(size).toBe(57);
    });
  });

  describe("matrix structure", () => {
    it("returns a 2D array of size x size", () => {
      const { matrix, size } = _generateQR("HELLO", 1);
      expect(matrix.length).toBe(size);
      for (const row of matrix) {
        expect(row.length).toBe(size);
      }
    });

    it("contains only 0 and 1 values", () => {
      const { matrix } = _generateQR("TEST123", 2);
      for (const row of matrix) {
        for (const cell of row) {
          expect(cell === 0 || cell === 1).toBe(true);
        }
      }
    });

    it("has correct finder pattern at top-left (0,0)", () => {
      const { matrix } = _generateQR("HELLO", 1);
      verifyFinderPattern(matrix, 0, 0);
    });

    it("has correct finder pattern at top-right (0, size-7)", () => {
      const { matrix, size } = _generateQR("HELLO", 1);
      verifyFinderPattern(matrix, 0, size - 7);
    });

    it("has correct finder pattern at bottom-left (size-7, 0)", () => {
      const { matrix, size } = _generateQR("HELLO", 1);
      verifyFinderPattern(matrix, size - 7, 0);
    });

    it("has alternating timing pattern along row 6", () => {
      const { matrix, size } = _generateQR("HELLO WORLD", 1);
      for (let c = 8; c < size - 8; c++) {
        expect(matrix[6][c]).toBe(c % 2 === 0 ? 1 : 0);
      }
    });

    it("has dark module at (size-8, 8)", () => {
      const { matrix, size } = _generateQR("HELLO", 1);
      expect(matrix[size - 8][8]).toBe(1);
    });
  });

  describe("ECC level effects", () => {
    it("different ECC levels produce different versions for same data", () => {
      const text = "A".repeat(40);
      const sizeL = _generateQR(text, 0).size;
      const sizeH = _generateQR(text, 3).size;
      expect(sizeH).toBeGreaterThan(sizeL);
    });
  });

  describe("error handling", () => {
    it("returns V1 for empty string (valid per QR spec)", () => {
      const { size } = _generateQR("", 1);
      expect(size).toBe(21);
    });

    it("throws for extremely long text", () => {
      const longText = "A".repeat(10000);
      expect(() => _generateQR(longText, 3)).toThrow();
    });

    it("throws for invalid ECC level", () => {
      expect(() => _generateQR("test", 5)).toThrow(RangeError);
    });
  });

  describe("special characters", () => {
    it("handles unicode characters", () => {
      const { matrix, size } = _generateQR("Olá mundo! Ação", 1);
      expect(size).toBeGreaterThan(0);
      expect(matrix.length).toBe(size);
    });

    it("handles emojis", () => {
      const { matrix, size } = _generateQR("Hello 🎉🚀", 1);
      expect(size).toBeGreaterThan(0);
      expect(matrix.length).toBe(size);
    });
  });
});

describe("renderPixQr", () => {
  let imgEl, loadingEl, errorEl;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: "",
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
      toDataURL: vi.fn(() => "data:image/png;base64,mock"),
    }));
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,mock");

    document.body.innerHTML = `
      <img id="qr-img" class="hidden" />
      <div id="qr-loading"></div>
      <div id="qr-error" class="hidden"></div>
    `;
    imgEl = document.getElementById("qr-img");
    loadingEl = document.getElementById("qr-loading");
    errorEl = document.getElementById("qr-error");
  });

  it("sets img.src to a data URL", () => {
    renderPixQr("HELLO", imgEl, { loadingEl, errorEl });
    expect(imgEl.src).toMatch(/^data:image\/png/);
  });

  it("shows the img element by removing hidden class", () => {
    renderPixQr("HELLO", imgEl, { loadingEl, errorEl });
    expect(imgEl.classList.contains("hidden")).toBe(false);
  });

  it("hides the loading element by adding hidden class", () => {
    renderPixQr("HELLO", imgEl, { loadingEl, errorEl });
    expect(loadingEl.classList.contains("hidden")).toBe(true);
  });

  it("hides the error element", () => {
    renderPixQr("HELLO", imgEl, { loadingEl, errorEl });
    expect(errorEl.classList.contains("hidden")).toBe(true);
  });

  it("shows error element when text is too long", () => {
    const tooLong = "A".repeat(10000);
    renderPixQr(tooLong, imgEl, { loadingEl, errorEl });
    expect(errorEl.classList.contains("hidden")).toBe(false);
    expect(loadingEl.classList.contains("hidden")).toBe(true);
  });
});

describe("renderBrandedQr", () => {
  let imgEl, loadingEl, errorEl;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: "",
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
      toDataURL: vi.fn(() => "data:image/png;base64,mock"),
    }));
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,mock");

    class MockImage {
      constructor() { this._src = ""; }
      set src(val) { this._src = val; if (this.onload) setTimeout(() => this.onload(), 0); }
      get src() { return this._src; }
    }
    global.Image = MockImage;

    document.body.innerHTML = `
      <img id="qr-img" class="hidden" />
      <div id="qr-loading"></div>
      <div id="qr-error" class="hidden"></div>
    `;
    imgEl = document.getElementById("qr-img");
    loadingEl = document.getElementById("qr-loading");
    errorEl = document.getElementById("qr-error");
  });

  it("sets img.src to a data URL after logo loads", async () => {
    vi.useFakeTimers();
    renderBrandedQr("HELLO", imgEl, { loadingEl, errorEl });
    await vi.advanceTimersByTimeAsync(100);
    expect(imgEl.src).toMatch(/^data:image\/png/);
    vi.useRealTimers();
  });

  it("shows the img element after logo loads", async () => {
    vi.useFakeTimers();
    renderBrandedQr("HELLO", imgEl, { loadingEl, errorEl });
    await vi.advanceTimersByTimeAsync(100);
    expect(imgEl.classList.contains("hidden")).toBe(false);
    vi.useRealTimers();
  });

  it("hides the loading element after logo loads", async () => {
    vi.useFakeTimers();
    renderBrandedQr("HELLO", imgEl, { loadingEl, errorEl });
    await vi.advanceTimersByTimeAsync(100);
    expect(loadingEl.classList.contains("hidden")).toBe(true);
    vi.useRealTimers();
  });

  it("hides the error element", async () => {
    vi.useFakeTimers();
    renderBrandedQr("HELLO", imgEl, { loadingEl, errorEl });
    await vi.advanceTimersByTimeAsync(100);
    expect(errorEl.classList.contains("hidden")).toBe(true);
    vi.useRealTimers();
  });

  it("shows error element when text is too long", () => {
    const tooLong = "A".repeat(10000);
    renderBrandedQr(tooLong, imgEl, { loadingEl, errorEl });
    expect(errorEl.classList.contains("hidden")).toBe(false);
    expect(loadingEl.classList.contains("hidden")).toBe(true);
  });
});

describe("integration: realistic inputs", () => {
  it("generates valid QR for a real Liquid address", () => {
    const { matrix, size } = _generateQR(LIQUID_ADDR, 3);
    expect(size).toBeGreaterThan(0);
    expect(matrix.length).toBe(size);
    for (const row of matrix) {
      expect(row.length).toBe(size);
      for (const cell of row) {
        expect(cell === 0 || cell === 1).toBe(true);
      }
    }
    verifyFinderPattern(matrix, 0, 0);
    verifyFinderPattern(matrix, 0, size - 7);
    verifyFinderPattern(matrix, size - 7, 0);
  });

  it("generates valid QR for a realistic PIX copy-paste code", () => {
    const pixCode = "00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540510.005802BR5925NOME DO RECEBEDOR LTDA6009SAO PAULO62070503***6304ABCD";
    const { matrix, size } = _generateQR(pixCode, 1);
    expect(size).toBeGreaterThan(0);
    expect(matrix.length).toBe(size);
    for (const row of matrix) {
      expect(row.length).toBe(size);
      for (const cell of row) {
        expect(cell === 0 || cell === 1).toBe(true);
      }
    }
    verifyFinderPattern(matrix, 0, 0);
    verifyFinderPattern(matrix, 0, size - 7);
    verifyFinderPattern(matrix, size - 7, 0);
  });
});
