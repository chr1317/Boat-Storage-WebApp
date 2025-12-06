<template>
  <div class="p-6">
    <!-- HEADER + FILTERS -->
    <div class="flex justify-between items-center mb-4 flex-wrap gap-4">
      <h2 class="text-2xl font-semibold">{{ t("works.all_title") }}</h2>

      <div class="flex gap-3 items-center flex-wrap">
        <!-- Status Filter -->
        <Dropdown
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Filter by status"
          class="w-48"
          @change="filterWorks"
        />

        <Button
          v-if="isStaff"
          icon="pi pi-plus"
          :label="t('works.add')"
          severity="primary"
          class="w-full sm:w-auto"
          @click="openAddDialog"
        />
      </div>
    </div>

    <!-- WORK TABLE -->
    <DataTable
      :value="filteredWorks"
      dataKey="WID"
      :paginator="true"
      :rows="12"
      class="p-datatable-sm"
      :loading="loading"
      v-model:expandedRows="expandedRows"
      @row-click="openDetails"
    >
      <Column expander style="width: 3rem" />

      <Column field="WID" header="ID" sortable style="width: 80px" />

      <Column field="Boat.name" :header="t('works.boat')" sortable>
        <template #body="{ data }">
          <Button
            link
            class="p-0 underline"
            @click.stop="goToBoat(data.BID)"
          >
            {{ data.Boat?.name || "—" }}
          </Button>
        </template>
      </Column>

      <Column field="Service.Name" :header="t('works.service')" sortable />

      <Column field="Service.Part" :header="t('works.part')" />

      <Column field="User.Name" :header="t('works.worker')">
        <template #body="{ data }">
          <span v-if="!data.parentWID">{{ data.User?.Name || '—' }}</span>
        </template>
      </Column>

      <Column field="Date" :header="t('works.date')" sortable>
        <template #body="{ data }">{{ formatDate(data.Date) }}</template>
      </Column>

      <Column field="State" :header="t('works.status')" sortable>
        <template #body="{ data }">
          <Tag :value="data.State" :severity="getStateColor(data.State)" />
        </template>
      </Column>

      <Column :header="t('works.actions')" style="width: 10rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center">
            <Button
              icon="pi pi-search"
              rounded
              outlined
              size="small"
              severity="info"
              v-tooltip.bottom="'View details'"
              @click.stop="openDetails({ data })"
            />

            <Button
              icon="pi pi-directions"
              rounded
              outlined
              size="small"
              severity="secondary"
              v-tooltip.bottom="'Go to boat'"
              @click.stop="goToBoat(data.BID)"
            />

            <Button
              v-if="isStaff"
              icon="pi pi-trash"
              rounded
              outlined
              size="small"
              severity="danger"
              v-tooltip.bottom="t('works.delete')"
              @click.stop="handleDeleteWork(data.WID)"
            />
          </div>
        </template>
      </Column>

      <!-- EXPANSION: SUBTASKS -->
      <template #expansion="{ data }">
        <div v-if="data.subtasks?.length" class="p-3 bg-gray-50 rounded">
          <h4 class="text-sm font-semibold mb-2">{{ t("works.subTasks") }}</h4>

          <DataTable :value="data.subtasks" size="small">
            <Column field="Service.Name" :header="t('works.service')" />
            <Column field="Comment" :header="t('works.comment')" />
            <Column field="Date" :header="t('works.date')">
              <template #body="{ data }">
                {{ formatDate(data.Date) }}
              </template>
            </Column>
            <Column field="State" :header="t('works.status')">
              <template #body="{ data }">
                <Tag :value="data.State" :severity="getStateColor(data.State)" />
              </template>
            </Column>
          </DataTable>
        </div>

        <div v-else class="text-center text-gray-400 italic py-2">
          {{ t("works.no_subtasks") }}
        </div>
      </template>
    </DataTable>

    <!-- WORK DETAILS DIALOG -->
    <WorkDetailsDialog
      v-model:visible="detailsDialogVisible"
      :work="selectedWork"
      @refresh="fetchWorks"
    />

    <!-- Add Work Dialog -->
    <WorkAddDialog
      v-model:visible="addDialogVisible"
      @created="fetchWorks"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useToast } from "primevue/usetoast";

import { getAllWorks, deleteWork } from "../services/workService";

import WorkDetailsDialog from "../components/WorkDetailsDialog.vue";
import WorkAddDialog from "../components/Boat/BoatAddWorkDialog.vue";

const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const auth = useAuthStore();

const works = ref([]);
const filteredWorks = ref([]);

const statusFilter = ref(null);
const detailsDialogVisible = ref(false);

const selectedWork = ref(null);
const loading = ref(true);
const expandedRows = ref([]);

const addDialogVisible = ref(false);

const isStaff = computed(() =>
  ["Admin", "Employee"].includes(auth.user?.Role)
);

const statusOptions = [
  { label: t("state.all"), value: null },
  { label: "To do", value: "ToDo" },
  { label: "In progress", value: "InProgress" },
  { label: "Done", value: "Done" },
];

onMounted(fetchWorks);

async function fetchWorks() {
  loading.value = true;
  try {
    works.value = await getAllWorks();
    filteredWorks.value = works.value;
    expandedRows.value = [];
  } catch {
    toast.add({ severity: "error", summary: "Error loading works" });
  } finally {
    loading.value = false;
  }
}

function filterWorks() {
  if (!statusFilter.value) {
    filteredWorks.value = works.value;
    return;
  }
  filteredWorks.value = works.value.filter(w => w.State === statusFilter.value);
}

function openDetails({ data }) {
  selectedWork.value = data;
  detailsDialogVisible.value = true;
}

function goToBoat(boatId) {
  router.push(`/home/boats/${boatId}`);
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString() : "—";
}

function getStateColor(s) {
  return {
    Done: "success",
    InProgress: "info",
    ToDo: "warning",
  }[s];
}

async function handleDeleteWork(id) {
  if (!confirm(t("works.confirm_delete"))) return;
  try {
    await deleteWork(id);
    toast.add({ severity: "success", summary: t("works.deleted") });
    fetchWorks();
  } catch {
    toast.add({ severity: "error", summary: "Error deleting" });
  }
}

function openAddDialog() {
  addDialogVisible.value = true;
}
</script>
