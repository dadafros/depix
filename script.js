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
let deferredPrompt = null;
let qrCopyPaste = "";
let emAndamento = false;

/* =========================
   FORMATAÇÃO R$
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

    if (!data?.response?.qrImageUrl) {
      throw new Error("Resposta inválida da API");
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
   PWA INSTALL (SEM MAGIA)
========================= */

/* Android / Desktop */
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
});

/* Clique no botão flutuante */
installFab.addEventListener("click", async () => {
  // Android → instala de verdade
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return;
  }

  // Qualquer outro caso (iPhone) → modal
  modal.classList.remove("hidden");
});

/* Fechar modal */
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});
