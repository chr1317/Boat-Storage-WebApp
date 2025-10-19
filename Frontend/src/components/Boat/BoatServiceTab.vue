<template>
  <div class="p-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">{{ t("boat.works_title") }}</h2>

      <Button
        v-if="isAdminOrEmployee"
        icon="pi pi-plus"
        label="Add work"
        severity="primary"
        @click="openCreateDialog"
      />
    </div>

    <!-- Table -->
    <DataTable
      :value="works"
      dataKey="WID"
      :paginator="true"
      :rows="10"
      class="p-datatable-sm"
      :loading="loading"
      v-if="works.length > 0"
    >
      <Column field="Service.Name" header="Service" sortable />
      <Column field="Service.Part" header="Part" />
      <Column field="User.Name" header="Worker" />
      <Column field="Date" header="Date">
        <template #body="{ data }">{{ formatDate(data.Date) }}</template>
      </Column>
      <Column field="HR" header="Hours" />
      <Column field="Comment" header="Comment" />
      <Column field="State" header="Status">
        <template #body="{ data }">
          <Tag :value="data.State" :severity="getStateColor(data.State)" />
        </template>
      </Column>

      <Column v-if="isAdminOrEmployee" header="Actions" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center">
            <Button
              icon="pi pi-refresh"
              rounded
              outlined
              size="small"
              severity="info"
              v-tooltip.bottom="'Change state'"
              @click="openStateDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              rounded
              outlined
              size="small"
              severity="danger"
              v-tooltip.bottom="'Delete'"
              @click="handleDeleteWork(data.WID)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Empty state -->
    <div v-else class="text-center text-gray-500 py-8">
      {{ t("boat.no_works") }}
    </div>

    <!-- Dialog: change state -->
    <Dialog
      v-model:visible="stateDialogVisible"
      modal
      header="Change work state"
      :closable="false"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-col gap-4">
        <Dropdown
          v-model="selectedState"
          :options="stateOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select state"
        />
        <div class="flex justify-end gap-2">
          <Button label="Cancel" outlined @click="stateDialogVisible = false" />
          <Button label="Save" @click="saveWorkState" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

// PrimeVue
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import Tag from "primevue/tag";

// API service
import { getWorks, updateWorkState, deleteWork } from "../../services/workService";

const { t } = useI18n({ useScope: "global" });
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const works = ref([]);
const loading = ref(true);
const stateDialogVisible = ref(false);
const selectedWork = ref(null);
const selectedState = ref(null);

const isAdminOrEmployee = computed(() =>
  ["Admin", "Employee"].includes(auth.user?.Role)
);

const stateOptions = [
  { label: "To do", value: "ToDo" },
  { label: "In progress", value: "InProgress" },
  { label: "Done", value: "Done" },
];

onMounted(fetchWorks);

async function fetchWorks() {
  try {
    loading.value = true;
    const boatId = route.params.id;
    works.value = await getWorks(boatId);
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: t("boat.load_works_error"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

function getStateColor(state) {
  switch (state) {
    case "Done":
      return "success";
    case "InProgress":
      return "info";
    case "ToDo":
      return "warning";
    default:
      return null;
  }
}

function openStateDialog(work) {
  selectedWork.value = work;
  selectedState.value = work.State;
  stateDialogVisible.value = true;
}

async function saveWorkState() {
  try {
    await updateWorkState(selectedWork.value.WID, selectedState.value);
    toast.add({ severity: "success", summary: "State updated", life: 2000 });
    stateDialogVisible.value = false;
    await fetchWorks();
  } catch {
    toast.add({ severity: "error", summary: "Error updating state", life: 3000 });
  }
}

async function handleDeleteWork(id) {
  if (!confirm(t("boat.confirm_delete_work"))) return;
  try {
    await deleteWork(id);
    toast.add({ severity: "success", summary: "Work deleted", life: 2000 });
    await fetchWorks();
  } catch {
    toast.add({ severity: "error", summary: "Error deleting work", life: 3000 });
  }
}

function openCreateDialog() {
  toast.add({
    severity: "info",
    summary: "Create work",
    detail: "This will open a create form (to be implemented)",
    life: 3000,
  });
}
</script>
