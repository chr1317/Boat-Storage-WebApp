<template>
  <div class="p-6 flex flex-col gap-6">

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

    <!-- STORAGE HEADER -->
    <Card v-else>
      <template #title>
  <h2 class="text-xl font-bold flex items-center gap-3">
    {{ boat?.name || t("boat.unknownBoat") }}
    —
    {{ seasonRange }}

    <Button
      v-if="boat?.BID"
      icon="pi pi-external-link"
      size="small"
      outlined
      severity="secondary"
      :label="t('boat.go_to_details')"
      @click="goToBoatDetails"
    />
  </h2>
</template>


      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">

          <div>
            <span class="font-semibold">{{ t("boat.owner") }}:</span>
            <p>{{ boat?.User?.Name || "-" }} ({{ boat?.User?.Email || "-" }})</p>
          </div>

          <div>
            <span class="font-semibold">{{ t("boat.hallPosition") }}:</span>
            <p>
              {{ storage?.Position || t("boat.noPosition") }}
            </p>
          </div>

          <div>
            <span class="font-semibold">{{ t("boat.arrivalDate") }}:</span>
            <p>{{ storage?.ArrivalDate || t("common.not_set") }}</p>
          </div>

          <div>
            <span class="font-semibold">{{ t("boat.budget") }}:</span>
            <p>{{ storage?.Budget ?? "-" }}</p>
          </div>
          
        </div>
      </template>
      <div v-if="storage?.BoatPosition" class="flex justify-end">
  <Button
    icon="pi pi-map"
    :label="t('boat.show_on_hall')"
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
    </Card>

    <!-- TAB MENU -->
    <TabView v-model:activeIndex="activeTab" class="mt-4">

      <TabPanel :header="t('tabs.work')">
        <BoatServiceTab
          :AID="AID"
          :works="works"
          :loading="loading"
          @refresh="loadWorks"
        />
      </TabPanel>

      <TabPanel :header="t('tabs.problems')">
        <BoatProblemsTab
          :AID="AID"
          :problems="problems"
          @refresh="loadAll"
        />
      </TabPanel>

      <!-- <TabPanel v-if="isClient" :header="t('tabs.requests')">
        <BoatOutRequestForm
          :boat="boat"
          class="mt-4"
        />
      </TabPanel> -->


    </TabView>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BoatProblemsTab from "../components/Boat/BoatProblemsTab.vue";
import BoatServiceTab from "../components/Boat/BoatServiceTab.vue";
import BoatOutRequestForm from "../components/Boat/BoatOutRequestForm.vue";
import { getBoatStorageById } from "../services/boatStorageService";
import { getBoat } from "../services/boatService";
import { getWorkByStorage } from "../services/workService";
import { getProblemsByStorage } from "../services/problemService";
import { getAllOutRequests } from "../services/outRequestService";

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const AID = Number(route.params.AID);

const loading = ref(true);
const error = ref(null);

const storage = ref(null);
const boat = ref(null);
const works = ref([]);
const problems = ref([]);
const requests = ref([]);

const activeTab = ref(0);

// LOAD STORAGE RECORD
async function loadStorage() {
  try {
    storage.value = await getBoatStorageById(AID);
    if (storage.value?.BID) {
      boat.value = await getBoat(storage.value.BID);
    }
  } catch (err) {
    error.value = err.message || "Failed to load storage data";
  }
}

// LOAD TABS
async function loadWorks() {
  works.value = await getWorkByStorage(AID);
}

async function loadProblems() {
  problems.value = await getProblemsByStorage(AID);
}

// async function loadRequests() {
//   requests.value = await getAllOutRequests({ AID });
// }

// LOAD ALL
async function loadAll() {
  loading.value = true;

  await Promise.all([
    loadStorage(),
    loadWorks(),
    loadProblems(),
    // loadRequests(),
  ]);

  loading.value = false;
}

onMounted(loadAll);

const seasonRange = computed(() => {
  const season = storage.value?.Season;

  if (!season) {
    return t("season.unknown");
  }

  if (season.year_start && season.year_end) {
    return season.year_start === season.year_end
      ? `${season.year_start}`
      : `${season.year_start} / ${season.year_end}`;
  }

  return t("season.unknown");
});
function goToBoatDetails() {
  router.push(`/home/boats/${boat.value.BID}`);
}

</script>

<style scoped>
.header-card {
  padding: 20px;
  margin-bottom: 20px;
  background: #eef3f7;
  border-radius: 8px;
}
</style>
