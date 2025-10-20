<template>
  <div class="p-4">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">{{ t("boat.works_title") }}</h2>

      <Button
        v-if="isAdminOrEmployee"
        icon="pi pi-plus"
        :label="t('boat.addWork')"
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
      v-model:expandedRows="expandedRows"
    >
      <Column expander style="width: 3rem" />
      <Column field="Service.Name" :header="t('boat.service')" sortable />
      <Column field="Service.Part" :header="t('boat.part')" />
      <Column field="User.Name" :header="t('boat.worker')">
        <template #body="{ data }">
          <span v-if="!data.parentWID">{{ data.User?.Name || '—' }}</span>
        </template>
      </Column>
      <Column field="Date" :header="t('boat.date')">
        <template #body="{ data }">{{ formatDate(data.Date) }}</template>
      </Column>
      <Column field="HR" :header="t('boat.hours')">
        <template #body="{ data }">
          <span v-if="!data.parentWID">{{ data.HR || '—' }}</span>
        </template>
      </Column>
      <Column field="Comment" :header="t('boat.comment')" />
      <Column field="State" :header="t('boat.status')">
        <template #body="{ data }">
          <Tag :value="data.State" :severity="getStateColor(data.State)" />
        </template>
      </Column>

      <Column v-if="isAdminOrEmployee" :header="t('boat.actions')" style="width: 8rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center">
            <Button
              icon="pi pi-refresh"
              rounded
              outlined
              size="small"
              severity="info"
              v-tooltip.bottom="t('boat.changeState')"
              @click="openStateDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              rounded
              outlined
              size="small"
              severity="danger"
              v-tooltip.bottom="t('boat.delete')"
              @click="handleDeleteWork(data.WID)"
            />
          </div>
        </template>
      </Column>

      <!-- ✅ Expansion slot (wewnątrz DataTable!) -->
      <template #expansion="{ data }">
  <div v-if="data.subtasks?.length" class="p-3 bg-gray-50 rounded">
    <h4 class="text-sm font-semibold mb-2">{{ t('boat.subTasks') }}</h4>

    <DataTable :value="data.subtasks" size="small">
      <Column field="Service.Name" :header="t('boat.service')" />
      <Column field="Comment" :header="t('boat.comment')" />

      <!-- 🔹 Dodajemy kolumnę z datą wykonania -->
      <Column field="Date" :header="t('boat.date')">
        <template #body="{ data }">
          {{ data.Date ? formatDate(data.Date) : '—' }}
        </template>
      </Column>

      <Column field="State" :header="t('boat.status')">
        <template #body="{ data }">
          <Tag :value="data.State" :severity="getStateColor(data.State)" />
        </template>
      </Column>

      <Column v-if="isAdminOrEmployee" :header="t('boat.actions')" style="width: 6rem">
        <template #body="{ data }">
          <div class="flex justify-center gap-2">
            <Button
              icon="pi pi-refresh"
              rounded
              text
              size="small"
              @click="openStateDialog(data)"
              v-tooltip.bottom="t('boat.changeState')"
            />
            <Button
              icon="pi pi-trash"
              rounded
              text
              size="small"
              severity="danger"
              @click="handleDeleteWork(data.WID)"
              v-tooltip.bottom="t('boat.delete')"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <div v-else class="text-center text-gray-400 italic py-2">
    No subtasks
  </div>
</template>
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
  <BoatAddWorkDialog
  v-model:visible="addNewWorkDialogVisible"
  :boat-id="route.params.id"
  :season-id="works[0]?.seasonID || 1"
  :user-id="auth.user.UID"
  @created="fetchWorks"
  />
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import { getWorks, updateWorkState, deleteWork } from "../../services/workService";
import BoatAddWorkDialog from "./BoatAddWorkDialog.vue";

const { t } = useI18n({ useScope: "global" });
const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const works = ref([]);
const loading = ref(true);
const stateDialogVisible = ref(false);
const selectedWork = ref(null);
const selectedState = ref(null);
const expandedRows = ref([]);

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
    expandedRows.value = works.value.filter((w) => w.subtasks?.length);
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
