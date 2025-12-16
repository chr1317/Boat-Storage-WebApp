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

    <!-- TABLE -->
    <DataTable
      v-if="works.length"
      :value="works"
      dataKey="WID"
      :rows="10"
      paginator
      class="p-datatable-sm"
      v-model:expandedRows="expandedRows"
    >
      <Column expander style="width:3rem" />
      <Column field="Service.Name" :header="t('boat.service')" />

      <Column :header="t('boat.worker')">
        <template #body="{ data }">
          {{ data.User?.Name || "—" }}
        </template>
      </Column>

      <Column :header="t('boat.date')">
        <template #body="{ data }">
          {{ formatDate(data.Date) }}
        </template>
      </Column>

      <Column :header="t('boat.hours')">
        <template #body="{ data }">
          {{ data.HR ?? "—" }}
        </template>
      </Column>

      <Column field="Comment" :header="t('boat.comment')" />

      <Column :header="t('boat.status')">
        <template #body="{ data }">
          <Tag :value="data.State" :severity="getStateColor(data.State)" />
        </template>
      </Column>

      <!-- ACTIONS -->
      <Column v-if="isAdminOrEmployee" :header="t('boat.actions')" style="width:9rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center">
            <Button
              v-if="!data.parentWID"
              icon="pi pi-plus"
              rounded outlined size="small"
              severity="success"
              @click="openSubtaskDialog(data)"
            />
            <Button
              icon="pi pi-pencil"
              rounded outlined size="small"
              @click="openManageDialog(data)"
            />
            <Button
              icon="pi pi-trash"
              rounded outlined size="small" severity="danger"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>

      <!-- SUBTASKS -->
      <template #expansion="{ data }">
        <div v-if="data.subtasks?.length" class="p-3 bg-gray-50 rounded">
          <DataTable :value="data.subtasks" size="small">
            <Column field="Service.Name" :header="t('boat.service')" />
            <Column field="Comment" :header="t('boat.comment')" />
            <Column :header="t('boat.status')">
              <template #body="{ data }">
                <Tag :value="data.State" :severity="getStateColor(data.State)" />
              </template>
            </Column>
            <Column v-if="isAdminOrEmployee" :header="t('boat.actions')" style="width:6rem">
              <template #body="{ data }">
                <Button
                  icon="pi pi-pencil"
                  rounded outlined size="small"
                  @click="openManageDialog(data)"
                />
              </template>
            </Column>
          </DataTable>
        </div>

        <div v-else class="text-center italic text-gray-400 py-2">
          {{ t("works.no_subtasks") }}
        </div>
      </template>
    </DataTable>

    <div v-else class="text-center text-gray-500 py-8">
      {{ t("boat.no_works") }}
    </div>

    <!-- MANAGE WORK DIALOG -->
<Dialog
  v-model:visible="manageDialogVisible"
  :header="t('works.changeState')"
  modal
  style="width:420px"
  class="custom-dialog"
>
  <div class="flex flex-col gap-4">

    <!-- COMMENT -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">
        {{ t("works.comment") }}
      </label>
      <InputText
        v-model="editComment"
        :placeholder="t('works.comment')"
        class="w-full"
      />
    </div>

    <!-- STATE -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-semibold">
        {{ t("works.state") }}
      </label>
      <Dropdown
        v-model="editState"
        :options="stateOptions"
        optionLabel="label"
        optionValue="value"
        class="w-full"
      />
    </div>

    <!-- WORKER -->
    <div v-if="canChangeWorker" class="flex flex-col gap-1">
      <label class="text-sm font-semibold">
        {{ t("boat.worker") }}
      </label>
      <Dropdown
        v-model="editUID"
        :options="employees"
        optionLabel="Name"
        optionValue="UID"
        :placeholder="t('boat.select_worker')"
        filter
        class="w-full"
      />
    </div>

    <!-- HOURS -->
    <div v-if="canChangeHours" class="flex flex-col gap-1">
      <label class="text-sm font-semibold">
        {{ t("boat.hours") }}
      </label>
      <InputNumber
        v-model="editHR"
        :placeholder="t('boat.hours')"
        class="w-full"
      />
    </div>

    <div class="flex justify-end gap-2">
      <Button
        :label="t('common.cancel')"
        outlined
        @click="manageDialogVisible=false"
      />
      <Button
        :label="t('common.save')"
        @click="saveWorkChanges"
      />
    </div>

  </div>
</Dialog>

        <!-- ADD SUBTASK -->
    <Dialog
      v-model:visible="subtaskDialogVisible"
      :header="t('works.add_subtask')"
      modal
      style="width:420px"
      class="custom-dialog"
    >
      <div class="flex flex-col gap-3">

        <Dropdown
          v-model="subtaskSID"
          :options="services"
          optionLabel="Name"
          optionValue="SID"
          :placeholder="t('works.select_service')"
          filter
        />

        <InputText
          v-model="subtaskComment"
          :placeholder="t('works.comment')"
        />

        <div class="flex justify-end gap-2">
          <Button
            :label="t('common.cancel')"
            outlined
            @click="subtaskDialogVisible = false"
          />
          <Button
            :label="t('common.add')"
            @click="saveSubtask"
          />
        </div>
      </div>
    </Dialog>


    <!-- DELETE DIALOG -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      :header="t('works.delete')"
      modal
      style="width:400px"
      class="custom-dialog"
    >
      <p>{{ t("works.confirm_delete") }}</p>

      <div class="flex justify-end gap-2 mt-4">
        <Button :label="t('common.cancel')" outlined @click="deleteDialogVisible=false" />
        <Button
          :label="t('common.delete')"
          severity="danger"
          @click="handleConfirmDelete"
        />
      </div>
    </Dialog>

    <!-- ADD WORK -->
    <BoatAddWorkDialog
      v-model:visible="addWorkDialogVisible"
      :AID="AID"
      @created="emit('refresh')"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";
import { updateWork, deleteWork } from "../../services/workService";
import BoatAddWorkDialog from "./BoatAddWorkDialog.vue";
import { getServices } from "../../services/serviceService";
import { getUsers } from "../../services/userService";
import { createWorkForStorage } from "../../services/workService";


const props = defineProps({
  AID: Number,
  works: Array
});
const emit = defineEmits(["refresh"]);

const { t } = useI18n();
const auth = useAuthStore();

/* STATE */
const expandedRows = ref([]);
const manageDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const addWorkDialogVisible = ref(false);
const subtaskDialogVisible = ref(false);
const parentForSubtask = ref(null);
const subtaskSID = ref(null);
const subtaskComment = ref("");
const services = ref([]);
const employees = ref([]);
const editComment = ref("");




const selectedWork = ref(null);
const editState = ref(null);
const editUID = ref(null);
const editHR = ref(null);


onMounted(async () => {
  services.value = await getServices();
  const users = await getUsers();
  employees.value = users.filter(u =>
    ["Admin", "Employee"].includes(u.Role)
  );
});

/* PERMISSIONS */
const isAdminOrEmployee = computed(() =>
  ["Admin", "Employee"].includes(auth.user?.Role)
);

const canChangeWorker = computed(() =>
  selectedWork.value &&
  !selectedWork.value.parentWID &&
  selectedWork.value.State === "ToDo"
);

const canChangeHours = computed(() =>
  selectedWork.value &&
  !selectedWork.value.parentWID &&
  selectedWork.value.State !== "Done"
);

/* OPTIONS */
const stateOptions = [
  { label: t("works.state_TODO"), value: "ToDo" },
  { label: t("works.state_INPROGRESS"), value: "InProgress" },
  { label: t("works.state_DONE"), value: "Done" },
];



/* ACTIONS */
function openManageDialog(work) {
  selectedWork.value = work;
  editState.value = work.State;
  editUID.value = work.UID;
  editHR.value = work.HR;
  editComment.value = work.Comment;
  manageDialogVisible.value = true;
}

function openSubtaskDialog(work) {
  parentForSubtask.value = work;
  subtaskSID.value = null;
  subtaskComment.value = "";
  subtaskDialogVisible.value = true;
}


async function saveWorkChanges() {
  await updateWork(selectedWork.value.WID, {
    State: editState.value,
    Comment: editComment.value,
    UID: canChangeWorker.value ? editUID.value : undefined,
    HR: canChangeHours.value ? editHR.value : undefined
  });

  manageDialogVisible.value = false;
  emit("refresh");
}


async function saveSubtask() {
  await createWorkForStorage(props.AID, {
    parentWID: parentForSubtask.value.WID,
    SID: subtaskSID.value,
    Comment: subtaskComment.value || t("works.subTasks"),
    State: "ToDo"
  });

  subtaskDialogVisible.value = false;
  emit("refresh");
}


function confirmDelete(work) {
  selectedWork.value = work;
  deleteDialogVisible.value = true;
}

async function handleConfirmDelete() {
  await deleteWork(selectedWork.value.WID);
  deleteDialogVisible.value = false;
  emit("refresh");
}

function openCreateDialog() {
  addWorkDialogVisible.value = true;
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function getStateColor(s) {
  return { ToDo:"warning", InProgress:"info", Done:"success" }[s];
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