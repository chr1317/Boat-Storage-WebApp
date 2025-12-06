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
    <div
  v-if="boat?.Boathall && isStaff"
  class="flex justify-end mt-2"
  >
    <Button
  v-if="boat?.Boathall && isStaff"
  icon="pi pi-map"
  label="Show on hall"
  outlined
  severity="info"
  @click="showMap = true"
/>

<BoatHallMiniMap
  v-model:visible="showMap"
  :boatId="boat?.BID"
  :bhid="boat?.Boathall?.BHID"
/>
  </div>
    <!-- Qr dialog -->
    <div v-if="isAdmin && boat && !isMobile" class="flex justify-end mt-4">
    <Button
      icon="pi pi-qrcode"
      label="Generate QR Code"
      outlined
      severity="info"
      @click="showQRDialog = true"
    />
  </div>

  <BoatQRDialog
    v-if="boat"
    v-model:visible="showQRDialog"
    :boat="boat"
  />
    <!-- Tabs -->
    <TabView v-if="boat" v-model:activeIndex="activeTab" class="mt-4">
      <TabPanel :header="t('boat.info_tab')">
        <BoatInfoTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.engine_tab')">
        <BoatEngineTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.service_tab')">
        <BoatServiceTab ref="worksTabRef" :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.problems_tab')">
        <BoatProblemsTab :boat="boat" @work-created="refreshWorks"/>
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";


// Zakładki
import BoatInfoTab from "../components/Boat/BoatInfoTab.vue";
import BoatEngineTab from "../components/Boat/BoatEngineTab.vue";
import BoatServiceTab from "../components/Boat/BoatServiceTab.vue";
import BoatProblemsTab from "../components/Boat/BoatProblemsTab.vue";
import BoatQRDialog from "../components/Boat/BoatQRDialog.vue";
import BoatHallMiniMap from "../components/Boat/BoatHallMiniMap.vue";


// Serwis API
import { getBoat, getBoatByQR } from "../services/boatService";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { t } = useI18n({ useScope: "global" });

const tabIndexMap = {
  info: 0,
  engine: 1,
  service: 2,
  problems: 3,
};

const boat = ref(null);
const loading = ref(true);
const error = ref(null);
const showMap = ref(false);
const activeTab = ref(0);
const auth = useAuthStore();

const width = ref(window.innerWidth);
const isMobile = computed(() => width.value < 768);
const isStaff = computed(() => auth.role === "Admin" || auth.role === "Employee");

function handleResize() {
  width.value = window.innerWidth;
}

const worksTabRef = ref(null);

function refreshWorks() {
  if (worksTabRef.value?.fetchWorks) {
    worksTabRef.value.fetchWorks();
  }
}


onMounted(() => {
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

onMounted(async () => {
  try {
    const id = route.params.id;
    const qr = route.query.qr;

    if (qr) {
      boat.value = await getBoatByQR(qr);
    } else if (id) {
      boat.value = await getBoat(id);
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

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = tabIndexMap[tab] ?? 0;
  },
  { immediate: true }
);

const isAdmin = computed(() => auth.user?.Role === "Admin");
const showQRDialog = ref(false);

function goToHallMap() {
  if (!boat.value?.Boathall) return;

  router.push({
    name: "HallMap",
    params: { id: boat.value.Boathall.BHID },
    query: { boat: boat.value.BID },
  });
}
</script>
