<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
      <h2 class="text-2xl font-semibold">{{ t("problems.title") }}</h2>

      <Button
        v-if="isStaff"
        icon="pi pi-plus"
        :label="t('problems.add')"
        severity="primary"
        class="w-full sm:w-auto"
        @click="openAddDialog"
      />
    </div>

    <!-- Table -->
    <DynamicTable
      :data="problems"
      :columns="columns"
      :loading="loading"
      @row-click="showProblem"
      class="overflow-x-auto"
    >
      <template #actions>
        <Column header="Actions">
          <template #body="{ data }">
            <Button
              icon="pi pi-search"
              label="View"
              size="small"
              @click.stop="showProblem({ data })"
            />
          </template>
        </Column>
      </template>
    </DynamicTable>
  </div>

  <!-- Details dialog -->
  <Dialog
    v-model:visible="detailsDialog"
    modal
    :header="t('problems.details')"
    :style="{ width: '90vw', maxWidth: '500px' }"
    class="custom-dialog"
  >
    <div v-if="selected" class="flex flex-col gap-4">

      <div class="flex justify-between">
        <span>ID</span> 
        <span>{{ selected.PID }}</span>
      </div>

      <div class="flex justify-between">
        <span>{{ t("boat.boat") }}</span>
        <span>{{ selected.Boat?.name }} (BID: {{ selected.BID }})</span>
      </div>

      <div class="flex justify-between">
        <span>{{ t("problems.type") }}</span>
        <span>{{ selected.Type }}</span>
      </div>

      <!-- Description -->
      <div class="flex flex-col">
        <span class="font-semibold">{{ t("problems.description") }}</span>
        <span>{{ selected.Description }}</span>
      </div>

      <!-- Status -->
      <div class="flex justify-between">
        <span>{{ t("problems.status") }}</span>
        <span>{{ selected.Status }}</span>
      </div>

      <!-- Works list -->
      <div v-if="selected.Works?.length">
        <span class="font-semibold">{{ t("problems.works") }}</span>

        <ul class="list-disc ml-5 text-sm">
          <li v-for="w in selected.Works" :key="w.WID">
            Work #{{ w.WID }} – {{ w.State }}
          </li>
        </ul>
      </div>

      <!-- STAFF actions -->
      <div class="flex justify-end gap-2 mt-4" v-if="isStaff">
        <Button 
          icon="pi pi-plus" 
          label="Add Work" 
          outlined 
          @click="openAddWorkDialog" 
        />

        <Button 
          icon="pi pi-pencil" 
          :label="t('common.edit')" 
          outlined 
          @click="openEditDialog" 
        />

        <Button 
          icon="pi pi-trash" 
          :label="t('common.delete')" 
          severity="danger" 
          outlined 
          @click="deleteProblem" 
        />
      </div>
    </div>
  </Dialog>

  <!-- Add/Edit problem -->
  <Dialog
    v-model:visible="formDialog"
    modal
    :header="isEditing ? t('problems.edit') : t('problems.add')"
    :style="{ width: '90vw', maxWidth: '450px' }"
    class="custom-dialog"
  >
    <div class="flex flex-col gap-4">

      <!-- Boat selector -->
<div v-if="isStaff">
  <label class="block mb-1 font-medium">{{ t("boat.select") }}</label>

  <Dropdown
    v-model="form.BID"
    :options="boats"
    optionLabel="name"
    optionValue="BID"
    placeholder="Select boat"
    filter
    class="w-full"
  >
    <template #option="{ option }">
      <div class="flex justify-between items-center w-full px-1">
        <span class="truncate">
          {{ option.name }}
        </span>
        <small class="text-gray-400 ml-2 truncate">
          ID: {{ option.BID }} • {{ option.User?.Name }} {{ option.User?.Lastname }}
        </small>
      </div>
    </template>
  </Dropdown>
</div>


      <div v-if="isStaff">
        <label class="block mb-1 font-medium">{{ t("problems.type") }}</label>
        <select v-model="form.Type" class="border rounded-md p-2 w-full">
          <option value="Issue">Issue</option>
          <option value="ClientRequest">ClientRequest</option>
        </select>
      </div>

      <div>
  <label class="block mb-1 font-medium">{{ t("problems.description") }}</label>
  <Textarea
    v-model="form.Description"
    class="w-full"
    rows="4"
    autoResize
  />
</div>


    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="formDialog = false" />
      <Button label="Save" @click="saveProblem" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import DynamicTable from "../components/DynamicTable.vue";
import { getBoats } from "../services/boatService";

import {
  getProblems,
  createProblem,
  updateProblem,
  deleteProblemById
} from "../services/problemService";

const { t } = useI18n();
const auth = useAuthStore();
const isStaff = computed(() => ["Admin","Employee"].includes(auth.user?.Role));

const problems = ref([]);
const loading = ref(true);
const boats = ref([]);

const selected = ref(null);
const detailsDialog = ref(false);
const formDialog = ref(false);
const isEditing = ref(false);

const form = ref({
  BID: "",
  Description: "",
  Type: "ClientRequest",
});

const columns = computed(() => [
  { field: "PID", header: "ID", sortable: true },
  { field: "boatLabel", header: t("boat.boat") },
  { field: "Description", header: t("problems.description") },
  { field: "Type", header: t("problems.type") },
  { field: "Status", header: t("problems.status") },
  { field: "Date", header: t("problems.date"), format: formatDate },
]);

async function loadProblems() {
  loading.value = true;
  const res = await getProblems();
  const list = Array.isArray(res) ? res : res.data || [];

  problems.value = list.map((p) => ({
    ...p,
    boatLabel: p.Boat
      ? `${p.Boat.name} (BID: ${p.BID}) – ${p.Boat.User?.Name || ""} ${p.Boat.User?.Lastname || ""}`.trim()
      : `BID: ${p.BID}`
  }));

  loading.value = false;
}


onMounted(async () => {
  await loadProblems();
  boats.value = await getBoats(); // zawiera Boat + User
});

function showProblem(e) {
  selected.value = e.data;
  detailsDialog.value = true;
}

function openAddDialog() {
  form.value = { BID: "", Description: "", Type: "ClientRequest" };
  isEditing.value = false;
  formDialog.value = true;
}

function openEditDialog() {
  form.value = { ...selected.value };
  isEditing.value = true;
  detailsDialog.value = false;
  formDialog.value = true;
}

async function saveProblem() {
  if (isEditing.value) {
    await updateProblem(form.value.PID, form.value);
  } else {
    await createProblem(form.value);
  }
  formDialog.value = false;
  await loadProblems();
}

async function deleteProblem() {
  if (!selected.value) return;
  await deleteProblemById(selected.value.PID);
  detailsDialog.value = false;
  await loadProblems();
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString() : "-";
}
</script>
<style scoped>
.custom-dialog .p-dialog-content {
    padding: 1.5rem !important;
}

.custom-dialog .p-dialog-header {
    padding: 1.2rem 1.5rem !important;
}
</style>