<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    header="Boat QR Code"
    :style="{ width: '400px' }"
    dismissableMask
  >
    <div class="flex flex-col items-center gap-4 py-4">
      <div class="text-center text-sm">
        <h3 class="font-semibold text-lg">{{ boat.name }}</h3>
        <p>{{ boat.Type }} — HIN: {{ boat.HIN }}</p>
        <p v-if="boat.User">Owner: {{ boat.User.Name }}</p>
      </div>

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
import { computed } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import QrcodeVue from "qrcode.vue";

const props = defineProps({
  visible: Boolean,
  boat: { type: Object, required: true },
});

const emit = defineEmits(["update:visible"]);

const visibleProxy = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

const qrValue = computed(() => `${window.location.origin}/qr/${props.boat.QR || props.boat.BID}`);

function printQR() {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) {
    alert("Popup blocked — allow popups for this site to print QR.");
    return;
  }

  const qrCanvas = document.querySelector(".p-dialog-content canvas");
  if (!qrCanvas) return;
  const qrData = qrCanvas.toDataURL("image/png");

  const html = `
  <html>
  <head>
    <title>${props.boat.name} QR</title>
    <style>
      @page { size: A6; margin: 1cm; }
      body {
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 10mm;
        text-align: center;
      }
      .label {
        border: 2px solid #000;
        border-radius: 10px;
        padding: 20px;
        width: 100%;
        max-width: 300px;
      }
      h2 {
        margin: 5px 0;
        font-size: 18px;
      }
      p {
        margin: 0 0 10px;
        font-size: 14px;
      }
      img {
        margin-top: 10px;
        width: 180px;
        height: 180px;
      }
    </style>
  </head>
  <body>
    <div class="label">
      <h2>${props.boat.name || "Boat Name"}</h2>
      <p>${props.boat.User?.Name || "Owner"}</p>
      <img src="${qrData}" alt="QR Code" />
    </div>
  </body>
  </html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();

  w.onload = () => w.print();
}

function downloadQR() {
  const qrCanvas = document.querySelector(".p-dialog-content canvas");
  if (!qrCanvas) return;
  const qrData = qrCanvas.toDataURL("image/png");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const width = 400;
  const height = 500;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  ctx.fillStyle = "#000";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(props.boat.name || "Boat Name", width / 2, 60);
  ctx.font = "16px Arial";
  ctx.fillText(props.boat.User?.Name || "Owner", width / 2, 90);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, width / 2 - 90, 120, 180, 180);

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `Boat_${props.boat.name}_QR.png`;
    link.click();
  };
  img.src = qrData;
}
</script>
