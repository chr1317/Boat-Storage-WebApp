<template>
  <div class="p-4">
    <!-- HEADER -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <h3 class="text-lg font-semibold">Problems</h3>

      <Button
        label="Add problem"
        icon="pi pi-plus"
        :size="isMobile ? 'small' : null"
        :class="isMobile ? 'w-full justify-center text-sm py-2' : 'px-4 py-2'"
        @click="showAddDialog = true"
      />
    </div>

    <!-- FILTERS -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <InputText
        v-model="filters.description"
        placeholder="Search description"
        class="w-full text-sm"
      />
      <Dropdown
        v-model="filters.type"
        :options="typeOptionsWithAll"
        optionLabel="label"
        optionValue="value"
        placeholder="All types"
        class="w-full text-sm"
      />
      <Dropdown
        v-model="filters.status"
        :options="statusOptionsWithAll"
        optionLabel="label"
        optionValue="value"
        placeholder="All status"
        class="w-full text-sm"
      />
    </div>

    <!-- LIST AS CARDS ON MOBILE -->
    <div v-if="isMobile" class="flex flex-col gap-3">
      <div
        v-for="p in pagedItems"
        :key="p.PID"
        class="border rounded-lg p-3 bg-white shadow-sm"
      >
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-sm">#{{ p.PID }} — {{ p.Type }}</p>
            <p class="text-xs text-gray-500 break-words">
              {{ p.Description }}
            </p>
          </div>

          <Tag :value="p.Status" :severity="getStatusColor(p.Status)" />
        </div>

        <div class="mt-3 flex gap-2 flex-wrap text-xs">
          <Button
            label="Details"
            size="small"
            @click="openDetailsDialog(p)"
          />

          <Button
            v-if="isStaff"
            label="Create work"
            size="small"
            severity="info"
            :disabled="p.Type === 'Issue' && !p.ApprovedByClient"
            @click="openCreateWorkDialog(p)"
          />

          <Button
            v-if="!isStaff && p.Type === 'Issue'"
            label="Approve"
            size="small"
            severity="success"
            :disabled="p.ApprovedByClient"
            @click="openApproveDialog(p)"
          />
        </div>
      </div>

      <!-- PAGINATION -->
      <Paginator
        :rows="pageSize"
        :totalRecords="filteredProblems.length"
        v-model:first="first"
      />
    </div>

    <!-- DESKTOP TABLE -->
    <DataTable
      v-else
      :value="pagedItems"
      class="text-sm"
      :paginator="false"
    >
      <Column field="PID" header="ID" style="width:60px" />
      <Column field="Description" header="Description" />
      <Column field="Type" header="Type" style="width:120px" />
      <Column field="Status" header="Status" style="width:120px">
        <template #body="{ data }">
          <Tag :value="data.Status" :severity="getStatusColor(data.Status)" />
        </template>
      </Column>

      <Column header="Approved" style="width:120px">
        <template #body="{ data }">
          <span v-if="data.Type === 'Issue'">
            {{ data.ApprovedByClient ? "Yes" : "No" }}
          </span>
          <span v-else>-</span>
        </template>
      </Column>

      <Column header="Actions" style="width:260px">
        <template #body="{ data }">
          <div class="flex gap-2 flex-wrap">
            <Button
              label="Details"
              size="small"
              @click="openDetailsDialog(data)"
            />

            <Button
              v-if="isStaff"
              label="Create work"
              size="small"
              severity="info"
              :disabled="data.Type === 'Issue' && !data.ApprovedByClient"
              @click="openCreateWorkDialog(data)"
            />

            <Button
              v-if="!isStaff && data.Type === 'Issue'"
              label="Approve"
              size="small"
              severity="success"
              :disabled="data.ApprovedByClient"
              @click="openApproveDialog(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- PAGINATION DESKTOP -->
    <div v-if="!isMobile" class="mt-3 flex justify-end">
      <Paginator
        :rows="pageSize"
        :totalRecords="filteredProblems.length"
        v-model:first="first"
      />
    </div>

    <!-- EMPTY -->
    <p v-if="!problems.length" class="text-gray-500 text-sm mt-4">
      No problems yet.
    </p>

    <!-- DIALOGI -->

    <!-- ADD PROBLEM -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Report problem"
      modal
      class="custom-dialog"
      :style="{ width: isMobile ? '95vw' : '500px' }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <label>Description *</label>
          <Textarea v-model="form.Description" autoResize rows="3" class="w-full" />
        </div>

        <div v-if="isStaff">
          <label>Type</label>
          <Dropdown
            v-model="form.Type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <Button label="Cancel" outlined @click="showAddDialog = false" />
          <Button label="Save" @click="submitProblem" />
        </div>
      </div>
    </Dialog>

    <!-- DETAILS -->
    <Dialog
      v-model:visible="showDetailsDialog"
      header="Problem details"
      modal
      class="custom-dialog"
      :style="{ width: isMobile ? '90vw' : '500px' }"
    >
      <p><strong>ID:</strong> {{ selectedProblem.PID }}</p>
      <p><strong>Description:</strong> {{ selectedProblem.Description }}</p>
      <p><strong>Type:</strong> {{ selectedProblem.Type }}</p>
      <p><strong>Status:</strong> {{ selectedProblem.Status }}</p>

      <p class="mt-2">
        <strong>Approved by client:</strong>
        <span v-if="selectedProblem.Type === 'Issue'">
          {{ selectedProblem.ApprovedByClient ? "Yes" : "No" }}
        </span>
        <span v-else>-</span>
      </p>

      <div class="flex justify-end mt-4">
        <Button label="Close" @click="showDetailsDialog = false" />
      </div>
    </Dialog>

    <!-- CREATE WORK -->
    <Dialog
      v-model:visible="showCreateWorkDialog"
      header="Create work"
      modal
      class="custom-dialog"
      :style="{ width: isMobile ? '95vw' : '480px' }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <label class="font-semibold">Problem</label>
          <p class="p-2 bg-gray-100 rounded">
            {{ selectedProblemForWork?.Description }}
          </p>
        </div>

        <Dropdown
          v-model="workForm.SID"
          :options="services"
          optionLabel="Name"
          optionValue="SID"
          placeholder="Select service"
          class="w-full"
          filter
        />

        <InputText v-model="workForm.Comment" placeholder="Comment" class="w-full" />

        <InputNumber v-model="workForm.HR" placeholder="Hours" class="w-full" />

        <Dropdown
          v-model="workForm.UID"
          :options="workers"
          optionLabel="Name"
          optionValue="UID"
          placeholder="Select worker"
          class="w-full"
          filter
        />

        <div class="flex justify-end gap-2 mt-3">
          <Button label="Cancel" outlined @click="showCreateWorkDialog = false" />
          <Button label="Create" @click="submitWorkFromProblem" />
        </div>
      </div>
    </Dialog>


<Dialog
  v-model:visible="showApproveDialog"
  header="{{$t('problems.approveTitle')}}"
  modal
  class="custom-dialog"
  :style="{ width: isMobile ? '90vw' : '400px' }"
>
  <p>
    {{$t('problems.approveConfirm')}}:
    <strong>#{{ problemToApprove?.PID }}</strong> — 
    {{ problemToApprove?.Description }}
  </p>

  <div class="flex justify-end gap-2 mt-4">
    <Button
      label="{{$t('common.cancel')}}"
      outlined
      @click="showApproveDialog = false"
    />
    <Button
      label="{{$t('problems.approveButton')}}"
      severity="success"
      @click="confirmApprove"
    />
  </div>
</Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useAuthStore } from "../../stores/auth";

import {
  getProblems,
  createProblem,
  createWorkFromProblem,
  approveProblem as apiApproveProblem,
} from "../../services/problemService";

import { getServices } from "../../services/serviceService";
import { getUsers } from "../../services/userService";

import Tag from "primevue/tag";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Paginator from "primevue/paginator";
import InputNumber from "primevue/inputnumber";

const route = useRoute();
const toast = useToast();
const auth = useAuthStore();

const problems = ref([]);
const services = ref([]);
const workers = ref([]);
const showApproveDialog = ref(false);
const problemToApprove = ref(null);

const isStaff = computed(() => ["Admin", "Employee"].includes(auth.role));
// proste, nie-reaktywne, ale wystarczające do różnicowania widoku
const isMobile = computed(() => window.innerWidth < 768);

const filters = ref({
  description: "",
  type: "",
  status: "",
});

const typeOptions = [
  { label: "Issue", value: "Issue" },
  { label: "Client request", value: "ClientRequest" },
];

const typeOptionsWithAll = [
  { label: "All types", value: "" },
  ...typeOptions,
];

const statusOptionsWithAll = [
  { label: "All status", value: "" },
  { label: "New", value: "New" },
  { label: "In Progress", value: "InProgress" },
  { label: "Resolved", value: "Resolved" },
];

const showAddDialog = ref(false);
const showDetailsDialog = ref(false);
const showCreateWorkDialog = ref(false);

const selectedProblem = ref({});
const selectedProblemForWork = ref(null);

const form = ref({
  Description: "",
  Type: "ClientRequest",
});

const workForm = ref({
  SID: null,
  Comment: "",
  HR: null,
  UID: null,
});

/* LOAD */
async function load() {
  const all = await getProblems();
  problems.value = all.filter((p) => p.BID === Number(route.params.id));
}

async function confirmApprove() {
  if (!problemToApprove.value) return;

  await approve(problemToApprove.value);
  showApproveDialog.value = false;
}


function openApproveDialog(problem) {
  problemToApprove.value = problem;
  showApproveDialog.value = true;
}

onMounted(async () => {
  await load();
  services.value = await getServices();

  const all = await getUsers();
  workers.value = all.filter((u) => ["Admin", "Employee"].includes(u.Role));
});

/* FILTERING */
const filteredProblems = computed(() => {
  return problems.value.filter((p) => {
    return (
      (!filters.value.description ||
        p.Description.toLowerCase().includes(filters.value.description.toLowerCase())) &&
      (!filters.value.type || p.Type === filters.value.type) &&
      (!filters.value.status || p.Status === filters.value.status)
    );
  });
});

/* PAGINATION */
const first = ref(0);
const pageSize = 5;

const pagedItems = computed(() =>
  filteredProblems.value.slice(first.value, first.value + pageSize)
);

/* ACTIONS */
function openDetailsDialog(p) {
  selectedProblem.value = p;
  showDetailsDialog.value = true;
}

function openCreateWorkDialog(p) {
  selectedProblemForWork.value = p;
  workForm.value = { SID: null, Comment: "", HR: null, UID: null };
  showCreateWorkDialog.value = true;
}

async function approve(problem) {
  await apiApproveProblem(problem.PID);
  toast.add({ severity: "success", summary: "Approved", life: 1500 });
  await load();
}

async function submitProblem() {
  if (!form.value.Description.trim()) {
    toast.add({
      severity: "error",
      summary: "Description required",
      life: 1500,
    });
    return;
  }

  await createProblem({
    BID: Number(route.params.id),
    Description: form.value.Description,
    Type: isStaff.value ? form.value.Type : "ClientRequest",
  });

  toast.add({ severity: "success", summary: "Problem added", life: 1500 });
  form.value.Description = "";
  showAddDialog.value = false;
  await load();
}

async function submitWorkFromProblem() {
  await createWorkFromProblem(selectedProblemForWork.value.PID, {
    SID: workForm.value.SID,
    HR: workForm.value.HR,
    Comment: workForm.value.Comment,
    UID: workForm.value.UID,
  });

  toast.add({ severity: "success", summary: "Work created", life: 1500 });
  showCreateWorkDialog.value = false;
  await load();
}

function getStatusColor(s) {
  return (
    {
      New: "warning",
      InProgress: "info",
      Resolved: "success",
    }[s] || null
  );
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