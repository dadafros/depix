let qrCopy = "";

const valorInput = document.getElementById("valor");

valorInput.addEventListener("input", () => {
  let v = valorInput.value.replace(/\D/g, "");
  v = (v / 100).toFixed(2).replace(".", ",");
  v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  valorInput.value = "R$ " + v;
});

function centavos(v) {
  return Math.round(
    parseFloat(v.replace("R$", "").replace(/\./g, "").replace(",", ".")) * 100
  );
}

async function gerarQrCode() {
  const valor = valorInput.value;
  const endereco = document.getElementById("endereco").value.trim();

  if (!valor || !endereco) {
    alert("Preencha todos os campos");
    return;
  }

  document.getElementById("form").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");

  const res = await fetch("https://depix.davi-bf.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountInCents: centavos(valor),
      depixAddress: endereco
    })
  });

  const data = await res.json();

  qrCopy = data.response.qrCopyPaste;
  document.getElementById("qrImage").src = data.response.qrImageUrl;

  const idEl = document.getElementById("qrId");
  idEl.innerText = "Identificador: " + data.response.id;
  idEl.onclick = () => navigator.clipboard.writeText(data.response.id);

  document.getElementById("loading").classList.add("hidden");
  document.getElementById("resultado").classList.remove("hidden");
}

function copiarPix() {
  navigator.clipboard.writeText(qrCopy);
  document.getElementById("mensagem").innerText =
    "Código copiado, cole no app do seu banco";
}

function resetar() {
  location.reload();
}
