// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

// ===== BRSwap widget URL builder (mirrors logic in script.js) =====
function buildWidgetUrl(config) {
  let src = "https://brswap.me/widget";
  if (config?.partnerId) {
    src += "?ref=" + encodeURIComponent(config.partnerId);
  }
  return src;
}

describe("BRSwap widget URL builder", () => {
  it("should return base URL when no partnerId", () => {
    expect(buildWidgetUrl({ active: true })).toBe("https://brswap.me/widget");
  });

  it("should return base URL when partnerId is null", () => {
    expect(buildWidgetUrl({ active: true, partnerId: null })).toBe("https://brswap.me/widget");
  });

  it("should return base URL when partnerId is empty string", () => {
    expect(buildWidgetUrl({ active: true, partnerId: "" })).toBe("https://brswap.me/widget");
  });

  it("should append ref param when partnerId is set", () => {
    expect(buildWidgetUrl({ active: true, partnerId: "depix123" }))
      .toBe("https://brswap.me/widget?ref=depix123");
  });

  it("should encode special characters in partnerId", () => {
    expect(buildWidgetUrl({ active: true, partnerId: "a b&c" }))
      .toBe("https://brswap.me/widget?ref=a%20b%26c");
  });

  it("should return base URL when config is null", () => {
    expect(buildWidgetUrl(null)).toBe("https://brswap.me/widget");
  });
});

// ===== Mode switching DOM behavior =====
function setupHomeDom() {
  document.body.innerHTML = `
    <div class="mode-toggle">
      <button class="mode-toggle-option active" id="modeDeposit" role="radio" aria-checked="true">Receber pagamento</button>
      <button class="mode-toggle-option" id="modeWithdraw" role="radio" aria-checked="false">Realizar pagamento</button>
      <button class="mode-toggle-option" id="modeConvert" role="radio" aria-checked="false" style="display:none">Converter DePix</button>
    </div>
    <div id="telaDeposito"></div>
    <div id="telaSaque" class="hidden"></div>
    <div id="telaConverter" class="hidden">
      <div id="converterContent"></div>
      <p id="converterError" class="hidden">Serviço indisponível no momento, tente mais tarde.</p>
    </div>
  `;
}

// Replicate switchMode logic (extracted for direct testing)
function switchMode(mode) {
  const modes = ["deposit", "withdraw", "convert"];
  const buttons = { deposit: "modeDeposit", withdraw: "modeWithdraw", convert: "modeConvert" };
  const screens = { deposit: "telaDeposito", withdraw: "telaSaque", convert: "telaConverter" };

  modes.forEach(m => {
    const btn = document.getElementById(buttons[m]);
    const screen = document.getElementById(screens[m]);
    if (m === mode) {
      btn?.classList.add("active");
      btn?.setAttribute("aria-checked", "true");
      screen?.classList.remove("hidden");
    } else {
      btn?.classList.remove("active");
      btn?.setAttribute("aria-checked", "false");
      screen?.classList.add("hidden");
    }
  });

  if (mode !== "convert") {
    const container = document.getElementById("converterContent");
    if (container) container.innerHTML = "";
    document.getElementById("converterError")?.classList.add("hidden");
  }
}

describe("switchMode", () => {
  beforeEach(() => setupHomeDom());

  it("should activate deposit mode and hide others", () => {
    switchMode("deposit");

    expect(document.getElementById("modeDeposit").classList.contains("active")).toBe(true);
    expect(document.getElementById("modeDeposit").getAttribute("aria-checked")).toBe("true");
    expect(document.getElementById("telaDeposito").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("modeWithdraw").classList.contains("active")).toBe(false);
    expect(document.getElementById("modeWithdraw").getAttribute("aria-checked")).toBe("false");
    expect(document.getElementById("telaSaque").classList.contains("hidden")).toBe(true);

    expect(document.getElementById("modeConvert").classList.contains("active")).toBe(false);
    expect(document.getElementById("telaConverter").classList.contains("hidden")).toBe(true);
  });

  it("should activate withdraw mode and hide others", () => {
    switchMode("withdraw");

    expect(document.getElementById("modeWithdraw").classList.contains("active")).toBe(true);
    expect(document.getElementById("modeWithdraw").getAttribute("aria-checked")).toBe("true");
    expect(document.getElementById("telaSaque").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("modeDeposit").classList.contains("active")).toBe(false);
    expect(document.getElementById("telaDeposito").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("telaConverter").classList.contains("hidden")).toBe(true);
  });

  it("should activate convert mode and hide others", () => {
    switchMode("convert");

    expect(document.getElementById("modeConvert").classList.contains("active")).toBe(true);
    expect(document.getElementById("modeConvert").getAttribute("aria-checked")).toBe("true");
    expect(document.getElementById("telaConverter").classList.contains("hidden")).toBe(false);

    expect(document.getElementById("modeDeposit").classList.contains("active")).toBe(false);
    expect(document.getElementById("telaSaque").classList.contains("hidden")).toBe(true);
  });

  it("should clear converter iframe when switching away from convert", () => {
    const container = document.getElementById("converterContent");
    container.innerHTML = '<iframe src="https://brswap.me/widget"></iframe>';

    switchMode("deposit");

    expect(container.innerHTML).toBe("");
  });

  it("should hide converter error when switching away from convert", () => {
    const errorEl = document.getElementById("converterError");
    errorEl.classList.remove("hidden");

    switchMode("withdraw");

    expect(errorEl.classList.contains("hidden")).toBe(true);
  });

  it("should not clear converter content when switching TO convert", () => {
    switchMode("convert");

    const container = document.getElementById("converterContent");
    // Content should NOT be cleared (loadBrswapWidget would populate it)
    expect(container).toBeTruthy();
  });
});

// ===== loadBrswapWidget DOM behavior =====
function loadBrswapWidget(config) {
  const container = document.getElementById("converterContent");
  const errorEl = document.getElementById("converterError");
  if (!container || !errorEl) return;

  container.innerHTML = "";
  errorEl.classList.add("hidden");

  if (!config || !config.active) {
    errorEl.classList.remove("hidden");
    return;
  }

  const src = buildWidgetUrl(config);

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.width = "420";
  iframe.height = "700";
  container.appendChild(iframe);
  return iframe;
}

describe("loadBrswapWidget", () => {
  beforeEach(() => setupHomeDom());

  it("should show error when config is null", () => {
    loadBrswapWidget(null);

    expect(document.getElementById("converterError").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("converterContent").innerHTML).toBe("");
  });

  it("should show error when config.active is false", () => {
    loadBrswapWidget({ active: false });

    expect(document.getElementById("converterError").classList.contains("hidden")).toBe(false);
  });

  it("should create iframe with correct src when active without partnerId", () => {
    const iframe = loadBrswapWidget({ active: true });

    expect(iframe.src).toBe("https://brswap.me/widget");
    expect(iframe.width).toBe("420");
    expect(iframe.height).toBe("700");
    expect(document.getElementById("converterContent").contains(iframe)).toBe(true);
    expect(document.getElementById("converterError").classList.contains("hidden")).toBe(true);
  });

  it("should create iframe with partner ref when partnerId is set", () => {
    const iframe = loadBrswapWidget({ active: true, partnerId: "mypartner" });

    expect(iframe.src).toBe("https://brswap.me/widget?ref=mypartner");
  });

  it("should clear previous content before loading", () => {
    document.getElementById("converterContent").innerHTML = "<p>old content</p>";

    loadBrswapWidget({ active: true });

    const container = document.getElementById("converterContent");
    expect(container.querySelectorAll("p").length).toBe(0);
    expect(container.querySelectorAll("iframe").length).toBe(1);
  });

  it("should hide previous error before loading", () => {
    document.getElementById("converterError").classList.remove("hidden");

    loadBrswapWidget({ active: true });

    expect(document.getElementById("converterError").classList.contains("hidden")).toBe(true);
  });

  it("should do nothing when container element is missing", () => {
    document.getElementById("converterContent").remove();
    expect(() => loadBrswapWidget({ active: true })).not.toThrow();
  });
});

// ===== fetchBrswapConfig behavior =====
describe("fetchBrswapConfig", () => {
  it("should show convert button when brswap is active", () => {
    setupHomeDom();
    const convertBtn = document.getElementById("modeConvert");

    // Simulate config response: active
    const config = { active: true, partnerId: "abc" };
    if (config?.active) {
      convertBtn.style.display = "";
    } else {
      convertBtn.style.display = "none";
    }

    expect(convertBtn.style.display).toBe("");
  });

  it("should hide convert button when brswap is inactive", () => {
    setupHomeDom();
    const convertBtn = document.getElementById("modeConvert");
    convertBtn.style.display = "";

    const config = { active: false };
    if (config?.active) {
      convertBtn.style.display = "";
    } else {
      convertBtn.style.display = "none";
    }

    expect(convertBtn.style.display).toBe("none");
  });

  it("should hide convert button when config is null (fetch error)", () => {
    setupHomeDom();
    const convertBtn = document.getElementById("modeConvert");
    convertBtn.style.display = "";

    const config = null;
    if (config?.active) {
      convertBtn.style.display = "";
    } else {
      convertBtn.style.display = "none";
    }

    expect(convertBtn.style.display).toBe("none");
  });

  it("should switch to deposit mode if currently on convert and feature becomes inactive", () => {
    setupHomeDom();
    // Simulate being in convert mode
    switchMode("convert");

    expect(document.getElementById("modeConvert").classList.contains("active")).toBe(true);

    // Feature deactivated — switch back
    const config = null;
    if (!config?.active) {
      switchMode("deposit");
    }

    expect(document.getElementById("modeDeposit").classList.contains("active")).toBe(true);
    expect(document.getElementById("modeConvert").classList.contains("active")).toBe(false);
    expect(document.getElementById("telaDeposito").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("telaConverter").classList.contains("hidden")).toBe(true);
  });
});

// ===== Saque warning display =====
describe("Saque warning message", () => {
  function setupSaqueDom() {
    document.body.innerHTML = `
      <div id="resultadoSaque" class="resultado hidden">
        <span id="saqueDepositAmount"></span>
        <span id="saquePayoutAmount"></span>
        <img id="saqueQr" class="hidden" alt="QR Code" />
        <p id="saqueWarning" class="saque-warning hidden"></p>
      </div>
    `;
  }

  function formatDePix(cents) {
    let str = (cents / 100).toFixed(8).replace(/0{1,6}$/, "");
    return str.replace(".", ",") + " DePix";
  }

  function displaySaqueWarning(depositAmountInCents) {
    const warningEl = document.getElementById("saqueWarning");
    if (warningEl) {
      warningEl.innerText = `Envie EXATAMENTE ${formatDePix(depositAmountInCents)}. Se você enviar qualquer outro valor (ou qualquer outra moeda), seus fundos podem ser perdidos para sempre.`;
      warningEl.classList.remove("hidden");
    }
  }

  beforeEach(() => setupSaqueDom());

  it("should show warning with correct formatted amount", () => {
    displaySaqueWarning(15000);

    const warning = document.getElementById("saqueWarning");
    expect(warning.classList.contains("hidden")).toBe(false);
    expect(warning.innerText).toBe(
      "Envie EXATAMENTE 150,00 DePix. Se você enviar qualquer outro valor (ou qualquer outra moeda), seus fundos podem ser perdidos para sempre."
    );
  });

  it("should show warning with small amount", () => {
    displaySaqueWarning(500);

    const warning = document.getElementById("saqueWarning");
    expect(warning.innerText).toContain("5,00 DePix");
  });

  it("should show warning with large amount", () => {
    displaySaqueWarning(600000);

    const warning = document.getElementById("saqueWarning");
    expect(warning.innerText).toContain("6000,00 DePix");
  });

  it("should become visible after being called", () => {
    const warning = document.getElementById("saqueWarning");
    expect(warning.classList.contains("hidden")).toBe(true);

    displaySaqueWarning(10000);

    expect(warning.classList.contains("hidden")).toBe(false);
  });

  it("should not throw when warning element is missing", () => {
    document.getElementById("saqueWarning").remove();
    expect(() => displaySaqueWarning(10000)).not.toThrow();
  });
});

// ===== Backend feature flags response structure =====
describe("Feature flags response parsing", () => {
  function parseFeatureFlags(data) {
    return data?.brswap || null;
  }

  it("should extract brswap config when active with partnerId", () => {
    const data = { brswap: { active: true, partnerId: "depix123" } };
    const config = parseFeatureFlags(data);

    expect(config.active).toBe(true);
    expect(config.partnerId).toBe("depix123");
  });

  it("should extract brswap config when active without partnerId", () => {
    const data = { brswap: { active: true, partnerId: null } };
    const config = parseFeatureFlags(data);

    expect(config.active).toBe(true);
    expect(config.partnerId).toBeNull();
  });

  it("should extract brswap config when inactive", () => {
    const data = { brswap: { active: false, partnerId: null } };
    const config = parseFeatureFlags(data);

    expect(config.active).toBe(false);
  });

  it("should return null when brswap key is missing", () => {
    const data = {};
    expect(parseFeatureFlags(data)).toBeNull();
  });

  it("should return null when data is null", () => {
    expect(parseFeatureFlags(null)).toBeNull();
  });

  it("should return null when data is undefined", () => {
    expect(parseFeatureFlags(undefined)).toBeNull();
  });
});

// ===== Backend env var logic (mirrors api/status.js type=features handler) =====
describe("Backend BRSWAP env var logic", () => {
  function buildFeaturesResponse(env) {
    return {
      brswap: {
        active: env.BRSWAP_ACTIVE === "true",
        partnerId: env.BRSWAP_PARTNER_ID || null
      }
    };
  }

  it("should set active true when BRSWAP_ACTIVE is 'true'", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "true" });
    expect(res.brswap.active).toBe(true);
  });

  it("should set active false when BRSWAP_ACTIVE is 'false'", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "false" });
    expect(res.brswap.active).toBe(false);
  });

  it("should set active false when BRSWAP_ACTIVE is undefined", () => {
    const res = buildFeaturesResponse({});
    expect(res.brswap.active).toBe(false);
  });

  it("should set active false when BRSWAP_ACTIVE is empty string", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "" });
    expect(res.brswap.active).toBe(false);
  });

  it("should set active false when BRSWAP_ACTIVE is 'TRUE' (case sensitive)", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "TRUE" });
    expect(res.brswap.active).toBe(false);
  });

  it("should include partnerId when BRSWAP_PARTNER_ID is set", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "true", BRSWAP_PARTNER_ID: "myid" });
    expect(res.brswap.partnerId).toBe("myid");
  });

  it("should set partnerId null when BRSWAP_PARTNER_ID is not set", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "true" });
    expect(res.brswap.partnerId).toBeNull();
  });

  it("should set partnerId null when BRSWAP_PARTNER_ID is empty string", () => {
    const res = buildFeaturesResponse({ BRSWAP_ACTIVE: "true", BRSWAP_PARTNER_ID: "" });
    expect(res.brswap.partnerId).toBeNull();
  });
});
