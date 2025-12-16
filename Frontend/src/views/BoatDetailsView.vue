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

    <!-- BOAT CARD -->
    <Card v-else>
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
              ID {{ boat.Boathall?.BHID }}
              ({{ boat.Boathall?.Length }}×{{ boat.Boathall?.Width }})
            </p>
          </div>

          <div>
            <span class="font-semibold">{{ t("boat.qr") }}:</span>
            <p>{{ boat.QR }}</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- MAP BUTTON -->
     <div class="flex justify-end gap-2">

  <!-- SHOW ON HALL -->
  <Button
    v-if="boat?.Boathall && isStaff"
    icon="pi pi-map"
    :label="!isMobile ? t('boat.show_on_hall') : null"
    text
    severity="info"
    @click="showMap = true"
  />

  <!-- GENERATE QR -->
  <Button
    v-if="isAdmin && !isMobile"
    icon="pi pi-qrcode"
    :label="!isMobile ? t('boat.generate_qr') : null"
    text
    severity="info"
    @click="showQRDialog = true"
  />

  <!-- EDIT -->
  <Button
    v-if="isStaff"
    icon="pi pi-pencil"
    :label="!isMobile ? 'Edit' : null"
    severity="info"
    @click="editDialogVisible = true"
  />

</div>

     <div>

      <BoatHallMiniMap
        v-model:visible="showMap"
        :boatId="boat?.BID"
        :bhid="boat?.Boathall?.BHID"
      />

    <BoatQRDialog
      v-if="boat"
      v-model:visible="showQRDialog"
      :boat="boat"
    />
    </div>

    <EditBoatInfoDialog
      v-if="boat"
      v-model:visible="editDialogVisible"
      :boat="boat"
      @updated="reloadBoat"
    />

    <!-- TABS -->
    <TabView v-if="boat" v-model:activeIndex="activeTab" class="mt-4">
      <TabPanel :header="t('boat.info_tab')">
        <BoatInfoTab :boat="boat" />
      </TabPanel>

      <TabPanel :header="t('boat.engine_tab')">
        <BoatEngineTab :boat="boat" />
      </TabPanel>
    </TabView>

    <!-- STORAGE MANAGEMENT -->
    <Card>
      <template #title>
        <h3 class="text-xl font-bold">{{ t("season.management") }}</h3>
      </template>

      <template #content>

  <!-- ASSIGN BUTTON -->
  <div class="mb-4">
    <Button
      v-if="isStaff"
      icon="pi pi-plus"
      :label="t('season.assign')"
      severity="info"
      outlined
      @click="openAssignDialog"
    />
  </div>

  <!-- ALL STORAGES LIST -->
  <div v-if="storages.length" class="flex flex-col gap-3">

    <div
      v-for="s in sortedStorages"
      :key="s.AID"
      class="p-3 rounded-md flex justify-between items-center border"
      :class="storageClass(s)"
    >
      <div class="flex flex-col">
        <span class="font-semibold">
          {{ seasonLabel(s.Season) }}
        </span>

        <small class="text-gray-600">
          AID: {{ s.AID }} • {{ storageStatusLabel(s) }}
        </small>
      </div>

      <Button
        icon="pi pi-folder-open"
        size="small"
        @click="goToStorage(s.AID)"
      />
    </div>

  </div>

  <div v-else class="text-gray-500 text-sm">
    {{ t("season.no_storage_records") }}
  </div>

</template>

    </Card>

    <!-- FULL HISTORY -->
    <Button
      v-if="isStaff"
      icon="pi pi-history"
      :label="t('season.full_history')"
      outlined
      class="w-fit"
      @click="goToHistory"
    />

    <!-- ASSIGN DIALOG -->
    <Dialog
      v-if="isStaff"
      v-model:visible="assignDialog"
      :header="t('season.assign_header')"
      modal
      class="custom-dialog"
      style="width: 420px"
    >
      <div class="flex flex-col gap-4">

        <div class="text-sm text-gray-600">
          {{ t("season.assign_info", { boat: boat?.name || "-" }) }}
        </div>

        <div v-if="availableSeasons.length === 0" class="text-center text-gray-600 py-2">
          {{ t("season.no_available") }}
        </div>

        <Dropdown
          v-else
          v-model="selectedSeason"
          :options="availableSeasons"
          optionLabel="label"
          optionValue="seasonID"
          :placeholder="t('season.choose_placeholder')"
          class="w-full"
          filter
        />

        <div class="flex justify-end gap-2 mt-2" >
          <Button
            :label="t('common.cancel')"
            outlined
            @click="assignDialog = false"
          />
          <Button
            :label="t('season.confirm_assign')"
            icon="pi pi-check"
            severity="success"
            :disabled="!selectedSeason || availableSeasons.length === 0"
            @click="confirmAssign"
          />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";

import BoatQRDialog from "../components/Boat/BoatQRDialog.vue";
import BoatHallMiniMap from "../components/Boat/BoatHallMiniMap.vue";

import BoatInfoTab from "../components/Boat/BoatInfoTab.vue";
import BoatEngineTab from "../components/Boat/BoatEngineTab.vue";
import EditBoatInfoDialog from "../components/Boat/EditBoatInfoDialog.vue";

import { getBoat } from "../services/boatService";
import { getBoatStorageByBoat, createBoatStorage } from "../services/boatStorageService";
import { getSeasons } from "../services/seasonService";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const auth = useAuthStore();

const boat = ref(null);
const storages = ref([]);
const seasons = ref([]);

const loading = ref(true);
const error = ref(null);

const showMap = ref(false);
const showQRDialog = ref(false);

const assignDialog = ref(false);
const selectedSeason = ref(null);

const activeTab = ref(0);

const isAdmin = computed(() => auth.user?.Role === "Admin");
const isStaff = computed(() => ["Admin", "Employee"].includes(auth.user?.Role));
const isMobile = computed(() => window.innerWidth < 768);

const today = new Date();
const editDialogVisible = ref(false);

async function reloadBoat() {
  boat.value = await getBoat(route.params.id);
}



function seasonLabel(s) {
  if (!s) return "-";
  return `${s.year_start}/${s.year_end}`;
}


onMounted(async () => {
  try {
    const id = route.params.id;
    boat.value = await getBoat(id);

    seasons.value = await getSeasons();
    storages.value = await getBoatStorageByBoat(boat.value.BID);
  } catch (err) {
    error.value = err.message || "Load error";
  } finally {
    loading.value = false;
  }
});

const activeStorage = computed(() =>
  storages.value.find((s) => {
    if (!s.season) return false;
    const start = new Date(s.season.startDate);
    const end = new Date(s.season.endDate);
    return today >= start && today <= end;
  }) || null
);

const previousStorages = computed(() =>
  storages.value.filter((s) => s.season && new Date(s.season.endDate) < today)
);

const nextSeasons = computed(() =>
  seasons.value
    .filter((s) => new Date(s.startDate) > today)
    .map((season) => ({
      season,
      AID: storages.value.find((st) => st.seasonID === season.seasonID)?.AID || null
    }))
);


const availableSeasons = computed(() =>
  seasons.value
    .filter((s) => !storages.value.some((st) => st.seasonID === s.seasonID))
    .map((s) => ({
      ...s,
      label: `${s.year_start}/${s.year_end}`,
    }))
);

function goToStorage(AID) {
  router.push(`/home/storage/${AID}`);
}

function goToHistory() {
  router.push(`/home/boat/${boat.value.BID}/history`);
}

function openAssignDialog() {
  selectedSeason.value = null;
  assignDialog.value = true;
}

async function confirmAssign() {
  try {
    const res = await createBoatStorage({
      BID: boat.value.BID,
      seasonID: selectedSeason.value,
    });

    assignDialog.value = false;
  } catch (err) {
    alert("Error: " + (err.message || err));
  }
}

const sortedStorages = computed(() => {
  return [...storages.value].sort((a, b) => {
    const aStart = new Date(a.Season.startDate);
    const bStart = new Date(b.Season.startDate);
    return bStart - aStart;
  });
});


function storageStatusLabel(s) {
  const start = new Date(s.Season.startDate);
  const end = new Date(s.Season.endDate);

  if (today >= start && today <= end) return t("season.active");
  if (today < start) return t("season.upcoming");
  return t("season.previous");
}


function storageClass(s) {
  const start = new Date(s.Season.startDate);
  const end = new Date(s.Season.endDate);

  if (today >= start && today <= end)
    return "bg-green-100 border-green-300";

  if (today < start)
    return "bg-blue-50 border-blue-200";

  return "bg-gray-50 border-gray-200";
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
