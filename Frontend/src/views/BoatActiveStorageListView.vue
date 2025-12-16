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

    <!-- EMPTY -->
    <div
      v-else-if="activeStorages.length === 0"
      class="text-center py-10 text-gray-500"
    >
      <i class="pi pi-info-circle text-2xl"></i>
      <p class="mt-2">{{ t("storage.no_active") }}</p>
    </div>

    <!-- TABLE -->
    <DataTable
  v-else
  :value="activeStorages"
  stripedRows
  responsiveLayout="scroll"
  class="shadow-md rounded-lg cursor-pointer"
  @row-click="onRowClick"
>

  <Column field="AID" header="AID" sortable />

  <Column :header="t('boat.name')">
    <template #body="{ data }">
      <div class="font-medium">{{ data.boatName }}</div>
      <small class="text-gray-500">{{ data.boatHIN }}</small>
    </template>
  </Column>

  <Column :header="t('boat.owner')">
    <template #body="{ data }">
      {{ data.ownerName || "-" }}
    </template>
  </Column>

  <Column :header="t('storage.budget')">
    <template #body="{ data }">
      <span v-if="data.Budget">{{ data.Budget }} SEK</span>
      <span v-else class="text-gray-400">-</span>
    </template>
  </Column>

  <Column :header="t('storage.arrival')">
    <template #body="{ data }">
      <span v-if="data.ArrivalDate">{{ formatDate(data.ArrivalDate) }}</span>
      <span v-else class="text-gray-400">-</span>
    </template>
  </Column>

  <Column :header="t('common.actions')" style="width: 160px">
    <template #body="{ data }">
      <div class="flex gap-2">
        <Button
          icon="pi pi-folder-open"
          size="small"
          outlined
          @click.stop="goToStorage(data.AID)"
        />
        <Button
          icon="pi pi-trash"
          size="small"
          severity="danger"
          outlined
          @click.stop="openDeleteDialog(data)"
        />
      </div>
    </template>
  </Column>

</DataTable>


  </div>
  <Dialog
  v-model:visible="deleteDialog"
  modal
  :header="t('storage.delete_header')"
  style="width: 420px"
  class="custom-dialog"
>
  <div class="flex flex-col gap-4">
    <p>
      {{ t("storage.confirm_delete") }}
    </p>

    <div class="flex justify-end gap-2">
      <Button
        :label="t('common.cancel')"
        outlined
        @click="deleteDialog = false"
      />
      <Button
        :label="t('common.delete')"
        severity="danger"
        icon="pi pi-trash"
        @click="deleteConfirmed"
      />
    </div>
  </div>
</Dialog>

</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import {
  getAllBoatStorage,
  getLightBoatStorage,
  deleteBoatStorage
} from "../services/boatStorageService";

const router = useRouter();
const { t } = useI18n();
const toast = useToast();

const loading = ref(true);
const error = ref(null);
const storages = ref([]);

const deleteDialog = ref(false);
const storageToDelete = ref(null);

/* Date formatter */
function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

/* Load */
async function loadStorages() {
  loading.value = true;
  try {
    storages.value = await getLightBoatStorage();
  } catch (err) {
    error.value = err.message || "Error loading storage list";
  } finally {
    loading.value = false;
  }
}

onMounted(loadStorages);

/* Active season filter */
const today = new Date();

const activeStorages = computed(() =>
  storages.value.filter((s) => {
    if (!s.startDate || !s.endDate) return false;

    const start = new Date(s.startDate);
    const end = new Date(s.endDate);

    return today >= start && today <= end;
  })
);


/* Row click = open */
function onRowClick(e) {
  goToStorage(e.data.AID);
}

/* Navigation */
function goToStorage(AID) {
  router.push(`/home/storage/${AID}`);
}

function openDeleteDialog(storage) {
  storageToDelete.value = storage;
  deleteDialog.value = true;
}

async function deleteConfirmed() {
  try {
    await deleteBoatStorage(storageToDelete.value.AID);

    toast.add({
      severity: "success",
      summary: t("common.deleted"),
      life: 2000
    });

    deleteDialog.value = false;
    storageToDelete.value = null;
    await loadStorages();

  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.message || "Delete failed",
      life: 3000
    });
  }
}


</script>

<style scoped>
/* opcjonalnie hover */
.p-datatable tbody tr:hover {
  background: #f4f6f8;
}


.custom-dialog .p-dialog-content {
    padding: 1.5rem !important;
}

.custom-dialog .p-dialog-header {
    padding: 1.2rem 1.5rem !important;
}
</style>

