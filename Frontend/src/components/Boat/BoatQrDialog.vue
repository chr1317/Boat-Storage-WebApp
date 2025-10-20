<template>
  <Dialog
    v-model:visible="props.visible"
    modal
    header="Boat QR Code"
    :style="{ width: '400px' }"
    dismissableMask
  >
    <div class="flex flex-col items-center gap-4 py-4">
      <!-- Informacje o łodzi -->
      <div class="text-center text-sm">
        <h3 class="font-semibold text-lg">{{ boat.name }}</h3>
        <p>{{ boat.Type }} — HIN: {{ boat.HIN }}</p>
        <p v-if="boat.User">Owner: {{ boat.User.Name }}</p>
      </div>

      <!-- Kod QR -->
      <qrcode-vue :value="qrValue" :size="200" />

      <div class="flex gap-2">
        <Button icon="pi pi-print" label="Print" @click="printQR" />
        <Button icon="pi pi-download" label="Download" outlined @click="downloadQR" />
        <Button label="Close" text severity="secondary" @click="emit('update:visible', false)" />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import QrcodeVue from "qrcode.vue";

const props = defineProps({
  visible: Boolean,
  boat: { type: Object, required: true },
});

const emit = defineEmits(["update:visible"]);

const qrValue = computed(() => {
  return `${window.location.origin}/boats/${props.boat.BID}?qr=${props.boat.QR || props.boat.BID}`;
});

function printQR() {
  const qrCanvas = document.querySelector(".p-dialog-content canvas");
  if (!qrCanvas) {
    console.error("QR canvas not found!");
    return;
  }

  const qrData = qrCanvas.toDataURL("image/png");
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked — allow popups for this site to print QR.");
    return;
  }

  const doc = w.document;

  // 🧩 Tworzymy strukturę DOM zamiast używać document.write
  doc.open();

  // 🔹 Ustawiamy nagłówek
  doc.title = `${props.boat.name} - QR`;

  // 🔹 Style CSS dla A6 i eleganckiego wyglądu
  const style = doc.createElement("style");
  style.textContent = `
    @page { size: A6; margin: 1cm; }
    body {
      font-family: 'Arial', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 10mm;
      text-align: center;
    }
    .card {
      border: 2px solid #1d4ed8;
      border-radius: 10px;
      padding: 15px 10px;
      width: 100%;
      max-width: 280px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .logo {
      width: 60px;
      height: 60px;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 16px;
      margin: 4px 0;
      color: #1d4ed8;
    }
    p {
      font-size: 13px;
      margin: 0 0 6px;
      color: #333;
    }
    img.qr {
      width: 180px;
      height: 180px;
      margin-top: 10px;
    }
    footer {
      margin-top: 10px;
      font-size: 11px;
      color: #666;
    }
  `;
  doc.head.appendChild(style);

  // 🔹 Główna zawartość etykiety
  const card = doc.createElement("div");
  card.classList.add("card");

  const logo = doc.createElement("img");
  logo.src = "../assets/BoatLogoBGrem.png"; // ← upewnij się, że ścieżka istnieje w produkcji
  logo.classList.add("logo");

  const name = doc.createElement("h2");
  name.textContent = props.boat.name || "Unnamed Boat";

  const type = doc.createElement("p");
  type.textContent = props.boat.Type || "—";

  const qrImg = doc.createElement("img");
  qrImg.src = qrData;
  qrImg.classList.add("qr");

  const footer = doc.createElement("footer");
  footer.textContent = "BoatHall Service QR • boat-hall.com";

  card.append(logo, name, type, qrImg, footer);
  doc.body.appendChild(card);

  // 🔹 Po załadowaniu wydrukuj
  doc.close();
  w.onload = () => w.print();
}


function downloadQR() {
  const qrCanvas = document.querySelector("canvas");
  if (!qrCanvas) return;
  const link = document.createElement("a");
  link.href = qrCanvas.toDataURL("image/png");
  link.download = `Boat_${props.boat.name}_QR.png`;
  link.click();
}
</script>
