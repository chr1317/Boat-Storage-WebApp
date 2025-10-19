<template>
  <div class="p-6 flex flex-col gap-4">
    <!-- Loader -->
    <div v-if="loading" class="text-center text-gray-500 py-10">
      <i class="pi pi-spin pi-spinner text-2xl"></i>
      <p class="mt-2">{{ t("common.loading") }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center text-red-500 py-10">
      <i class="pi pi-exclamation-triangle text-2xl"></i>
      <p class="mt-2">{{ error }}</p>
    </div>

    <!-- Boat card -->
    <Card v-else-if="boat">
      <template #title>
        <div class="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 class="text-2xl font-bold">{{ boat.name }}</h2>
            <p class="text-sm text-gray-500">
              {{ boat.HIN }} • {{ boat.Type }}
            </p>
          </div>
          <Tag :value="boat.Drive" severity="info" />
        </div>
      </template>

      <template #content>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
          <div>
            <span class="font-semibold">{{ t("boat.owner") }}:</span>
            <p>{{ boat.User?.Name || "-" }}</p>
          </div>
          <div>
            <span class="font-semibold">{{ t("boat.phone") }}:</span>
            <p>{{ boat.User?.PhoneNr || "-" }}</p>
          </div>
          <div>
            <span class="font-semibold">{{ t("boat.boathall") }}:</span>
            <p>
              ID {{ boat.Boathall?.BHID }} ({{ boat.Boathall?.Length }}×{{ boat.Boathall?.Width }})
            </p>
          </div>
          <div>
            <span class="font-semibold">{{ t("boat.qr") }}:</span>
            <p>{{ boat.QR }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Tabs -->
    <TabView v-if="boat" v-model:activeIndex="activeTab" class="mt-4">
      <TabPanel :header="t('boat.info_tab')">
        <BoatInfoTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.engine_tab')">
        <BoatEngineTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.service_tab')">
        <BoatServiceTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.problems_tab')">
        <BoatProblemsTab :boat="boat" />
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";

// Zakładki
import BoatInfoTab from "../components/Boat/BoatInfoTab.vue";
import BoatEngineTab from "../components/Boat/BoatEngineTab.vue";
import BoatServiceTab from "../components/Boat/BoatServiceTab.vue";
import BoatProblemsTab from "../components/Boat/BoatProblemsTab.vue";

// Serwis API
import { getBoatById, getBoatByQR } from "../services/boatService";

const route = useRoute();
const toast = useToast();
const { t } = useI18n({ useScope: "global" });

const boat = ref(null);
const loading = ref(true);
const error = ref(null);
const activeTab = ref(0);

onMounted(async () => {
  try {
    const id = route.params.id;
    const qr = route.query.qr;

    if (qr) {
      boat.value = await getBoatByQR(qr);
    } else if (id) {
      boat.value = await getBoatById(id);
    } else {
      throw new Error("No boat identifier provided");
    }
  } catch (err) {
    error.value = err.message || "Failed to load boat details";
    toast.add({
      severity: "error",
      summary: "Error",
      detail: error.value,
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
});
</script>
