<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span class="font-semibold">{{ t("boat.type") }}:</span>
      <p>{{ boat.Type }}</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.drive") }}:</span>
      <p>{{ boat.Drive }}</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.length") }}:</span>
      <p>{{ boat.BoatDimension?.Length }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.width") }}:</span>
      <p>{{ boat.BoatDimension?.Width }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.height") }}:</span>
      <p>{{ boat.BoatDimension?.Height }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.weight") }}:</span>
      <p>{{ boat.BoatDimension?.Weight }} kg</p>
    </div>
  </div>

  <BoatOutRequestForm
    v-if="isClient"
    :boat="boat"
    class="mt-6"
  />
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BoatOutRequestForm from "./BoatOutRequestForm.vue"; // 🔥 DODAJ
import { computed } from "vue";
import { useAuthStore } from "../../stores/auth";

const { t } = useI18n({ useScope: "global" });

const auth = useAuthStore();
const isClient = computed(() => auth.user?.Role === "Client"); // 🔥 LOGIKA

defineProps({
  boat: Object
});
</script>
