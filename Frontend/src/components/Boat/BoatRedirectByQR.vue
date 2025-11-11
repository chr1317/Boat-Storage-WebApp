<script setup>
import { useRouter, useRoute } from "vue-router";
import { onMounted } from "vue";
import { getBoatByQR } from "../../services/boatService";

const router = useRouter();
const route = useRoute();

onMounted(async () => {
  const qr = route.params.qr;

  try {
    const boat = await getBoatByQR(qr);
    router.replace(`/boats/${boat.BID}?tab=service`);
  } catch (err) {
    console.error("QR redirect error:", err);
    const message = err.message || "";
    if (message.includes("401") || message.includes("No authorization token")) {
      const redirect = encodeURIComponent(`/qr/${qr}`);
      router.replace(`/login?redirect=${redirect}`);
    } else if (message.includes("403")) {
      router.replace("/unauthorized");
    } else {
      router.replace("/notfound");
    }
  }
});
</script>

<template>
  <div class="flex justify-center items-center h-screen text-gray-500">
    <i class="pi pi-spin pi-spinner text-2xl mr-2"></i>
    <span>Loading boat...</span>
  </div>
</template>
