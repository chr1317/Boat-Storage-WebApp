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

          <!-- OWNER -->
          <div>
            <span class="font-semibold">{{ t("boat.owner") }}:</span>
            <p>{{ boat?.User?.Name || "-" }} ({{ boat?.User?.Email || "-" }})</p>
          </div>

          <!-- HALL INFO -->
          <div>
            <span class="font-semibold">{{ t("boat.hall") }}:</span>
            <p>
              <span v-if="boat?.Boathall">
                {{ boat.Boathall.BHID }}
              </span>
              <span v-else>
                {{ t("boat.not_in_hall") }}
              </span>
            </p>
          </div>

          <!-- ARRIVAL DATE -->
          <div>
            <span class="font-semibold">{{ t("boat.arrivalDate") }}:</span>

            <div class="flex items-center gap-2 mt-1">
              <span>
                {{ storage?.ArrivalDate || t("common.not_set") }}
              </span>

              <Button
                v-if="isStaff"
                icon="pi pi-calendar"
                size="small"
                text
                severity="info"
                :label="storage?.ArrivalDate ? t('common.change') : t('common.set')"
                @click="openArrivalDialog"
              />
            </div>
          </div>

          <!-- BUDGET -->
          <div>
            <span class="font-semibold">{{ t("boat.budget") }}:</span>
            <p>{{ storage?.Budget ?? "-" }}</p>
          </div>

        </div>
      </template>

      <!-- MAP ACTION -->
      <div v-if="storage?.BoatPosition" class="flex justify-end mt-3">
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

    <!-- TABS -->
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

    </TabView>
    <BoatOutRequestForm
      v-if="isClient && canRequestOut"
      :AID="AID"
      :season="storage.Season"
    />

    <p
      v-else-if="isClient && !canRequestOut"
      class="text-sm text-gray-500 italic"
    >
      {{ t("outRequest.not_available") }}
    </p>


    <!-- ARRIVAL DATE DIALOG -->
    <Dialog
      :visible="arrivalDialog"
      @update:visible="v => arrivalDialog = v"
      modal
      :header="t('boat.arrivalDate')"
      :style="{ width: '400px' }"
      :breakpoints="{ '768px': '95vw' }"
      class="custom-dialog"
    >
      <div class="flex flex-col gap-4">
        <Calendar
          v-model="arrivalDate"
          dateFormat="yy-mm-dd"
          showIcon
          class="w-full"
        />
      </div>

      <template #footer>
        <Button
          :label="t('common.cancel')"
          outlined
          @click="arrivalDialog = false"
        />
        <Button
          :label="t('common.save')"
          @click="saveArrivalDate"
        />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";

import BoatProblemsTab from "../components/Boat/BoatProblemsTab.vue";
import BoatServiceTab from "../components/Boat/BoatServiceTab.vue";
import BoatHallMiniMap from "../components/Boat/BoatHallMiniMap.vue";
import BoatOutRequestForm from "../components/Boat/BoatOutRequestForm.vue";

import { getBoatStorageById, updateBoatStorage } from "../services/boatStorageService";
import { getBoat } from "../services/boatService";
import { getWorkByStorage } from "../services/workService";
import { getProblemsByStorage } from "../services/problemService";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const AID = Number(route.params.AID);

const loading = ref(true);
const error = ref(null);

const storage = ref(null);
const boat = ref(null);
const works = ref([]);
const problems = ref([]);

const activeTab = ref(0);
const showMap = ref(false);
const isStaff = computed(() => ["Admin", "Employee"].includes(auth.user?.Role));
const isClient = computed(() => auth.user?.Role === "Client");


const arrivalDialog = ref(false);
const arrivalDate = ref(null);

const canRequestOut = computed(() => {
  if (!storage.value?.Season) return false;

  const now = new Date();
  const start = new Date(storage.value.Season.startDate);
  const end = new Date(storage.value.Season.endDate);

  if (now < start || now > end) return false;
  if (storage.value.outDate) return false;

  return true;
});


function openArrivalDialog() {
  if (storage.value?.ArrivalDate) {
    const [y, m, d] = storage.value.ArrivalDate.split("-");
    arrivalDate.value = new Date(
      Number(y),
      Number(m) - 1,
      Number(d)
    );
  } else {
    arrivalDate.value = null;
  }

  arrivalDialog.value = true;
}

function formatLocalDateYYYYMMDD(date) {
  if (!date) return null;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}


async function saveArrivalDate() {
  await updateBoatStorage(AID, {
    ArrivalDate: formatLocalDateYYYYMMDD(arrivalDate.value),
    IsComing: !!arrivalDate.value,
  });

  arrivalDialog.value = false;
  await loadStorage();
}

async function loadStorage() {
  storage.value = await getBoatStorageById(AID);
  if (storage.value?.BID) {
    boat.value = await getBoat(storage.value.BID);
  }
}

async function loadWorks() {
  works.value = await getWorkByStorage(AID);
}

async function loadProblems() {
  problems.value = await getProblemsByStorage(AID);
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadStorage(), loadWorks(), loadProblems()]);
  } catch (err) {
    error.value = err.message || "Failed to load storage data";
  }
  loading.value = false;
}

onMounted(loadAll);

const seasonRange = computed(() => {
  const season = storage.value?.Season;
  if (!season) return t("season.unknown");

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

<style>
.custom-dialog .p-dialog-content {
    padding: 1.5rem !important;
}

.custom-dialog .p-dialog-header {
    padding: 1.2rem 1.5rem !important;
}
</style>
