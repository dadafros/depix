/* =========================
   ELEMENTOS
========================= */
const valorInput = document.getElementById("valor");
const enderecoInput = document.getElementById("endereco");

const btnGerar = document.getElementById("btnGerar");
const btnCopy = document.getElementById("btnCopy");
const btnReset = document.getElementById("btnReset");

const formEl = document.getElementById("form");
const loadingEl = document.getElementById("loading");
const resultadoEl = document.getElementById("resultado");
const qrImageEl = document.getElementById("qrImage");
const qrIdEl = document.getElementById("qrId");
const mensagemEl = document.getElementById("mensagem");

/* PWA */
const installFab = document.getElementById("installFab");
const modal = document.getElementById("installModal");
const closeModal = document.getElementById("closeModal");

/* =========================
   ESTADO
========================= */
let qrCopyPaste = "";
let emAndamento = false;
let deferredPrompt = null;

/* =========================
   FORMATAÇÃO DE VALOR
========================= */
valorInput.addEventListener("input", () => {
  let v = valorInput.value.replace(/\D/g, "");
  if (!v) {
    valorInput.value = "";
    return;
  }
  v = (v / 100).toFixed(2).replace(".", ",");
  v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  valorInput.value = "R$ " + v;
});

function toCents(valor) {
  return Math.round(
    parseFloat(
      valor.replace("R$", "").replace(/\./g, "").replace(",", ".")
    ) * 100
  );
}

/* =========================
   GERAR QR CODE
========================= */
btnGerar.addEventListener("click", async () => {
  if (emAndamento) return;

  mensagemEl.innerText = "";

  const valor = valorInput.value;
  const endereco = enderecoInput.value.trim();

  if (!valor || !endereco) {
    mensagemEl.innerText = "Preencha todos os campos";
    return;
  }

  emAndamento = true;
  btnGerar.disabled = true;

  formEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  try {
    const res = await fetch(
      "https://depix-backend.vercel.app/api/depix",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInCents: toCents(valor),
          depixAddress: endereco
        })
      }
    );

    const data = await res.json();

    if (data?.response?.errorMessage) {
      throw new Error(data.response.errorMessage);
    }

    qrCopyPaste = data.response.qrCopyPaste;
    qrImageEl.src = data.response.qrImageUrl;
    qrIdEl.innerText = "Identificador: " + data.response.id;

    loadingEl.classList.add("hidden");
    resultadoEl.classList.remove("hidden");

  } catch (err) {
    mensagemEl.innerText = err.message || "Erro ao gerar QR Code";
    loadingEl.classList.add("hidden");
    formEl.classList.remove("hidden");
  } finally {
    emAndamento = false;
    btnGerar.disabled = false;
  }
});

/* =========================
   COPIAR PIX
========================= */
btnCopy.addEventListener("click", () => {
  if (!qrCopyPaste) return;
  navigator.clipboard.writeText(qrCopyPaste);
  mensagemEl.innerText = "Código copiado. Cole no app do seu banco.";
});

/* =========================
   RESET
========================= */
btnReset.addEventListener("click", () => {
  window.location.reload();
});

/* =========================
   PWA – INSTALAÇÃO
========================= */

/* Detecta iOS corretamente */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

/* Android / Desktop */
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installFab.classList.remove("hidden");
});

/* Clique no botão flutuante */
installFab.addEventListener("click", async () => {
  // Android → instalação real
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installFab.classList.add("hidden");
    return;
  }

  // iPhone → mostrar instruções
  if (isIOS()) {
    modal.classList.remove("hidden");
  }
});

/* Fechar modal */
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

/* Se já estiver instalado, esconder botão */
if (
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true
) {
  installFab.classList.add("hidden");
}
