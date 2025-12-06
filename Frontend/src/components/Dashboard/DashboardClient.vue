<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">
      {{ t("clientBoats.title") }}
    </h2>

    <!-- loading -->
    <div v-if="loading" class="text-gray-500 text-sm">
      <i class="pi pi-spin pi-spinner mr-2" /> Loading...
    </div>

    <!-- 1 łódź – większa karta -->
    <div v-else-if="boats.length === 1">
      <div
        class="rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow-md transition max-w-md"
        @click="goToBoat(boats[0].BID)"
      >
        <h3 class="text-lg font-semibold mb-1">
          {{ boats[0].name }}
        </h3>

        <p class="text-sm text-gray-600">
          HIN: {{ boats[0].HIN }}
        </p>
        <p class="text-sm text-gray-600">
          {{ boats[0].Type }}
        </p>

        <div class="mt-2">
          <Tag
            :value="statusLabel(boats[0])"
            :severity="statusSeverity(boats[0])"
          />
        </div>
      </div>
    </div>

    <!-- wiele łodzi -->
    <div
      v-else-if="boats.length > 1"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="boat in boats"
        :key="boat.BID"
        class="rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow-md transition"
        @click="goToBoat(boat.BID)"
      >
        <h3 class="text-base font-semibold mb-1">
          {{ boat.name }}
        </h3>

        <p class="text-sm text-gray-600">HIN: {{ boat.HIN }}</p>
        <p class="text-xs text-gray-500 mb-1">{{ boat.Type }}</p>

        <Tag
          :value="statusLabel(boat)"
          :severity="statusSeverity(boat)"
        />
      </div>
    </div>

    <!-- brak łodzi -->
    <p
      v-else
      class="text-gray-500 text-sm mt-4"
    >
      {{ t("clientBoats.no_boats") }}
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

import { getBoats } from "../../services/boatService";
import Tag from "primevue/tag";

const boats = ref([]);
const loading = ref(false);
const router = useRouter();
const toast = useToast();
const { t } = useI18n({ useScope: "global" });

onMounted(async () => {
  loading.value = true;
  try {
    boats.value = await getBoats();
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: e.message || "Could not load boats",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
});

function goToBoat(id) {
  router.push(`/home/boats/${id}`);
}

function statusLabel(boat) {
  // out != null → ma zaplanowane wyjście
  if (boat.out) return t("clientBoats.status_reserved");
  return t("clientBoats.status_in_hall");
}

function statusSeverity(boat) {
  return boat.out ? "warning" : "success";
}
</script>
