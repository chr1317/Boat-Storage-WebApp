<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
      <h2 class="text-2xl font-semibold">{{ t("users.title") }}</h2>

      <Button
        icon="pi pi-plus"
        :label="t('common.add')"
        severity="primary"
        class="w-full sm:w-auto"
        @click="openAddDialog"
      />
    </div>

    <!-- Table -->
    <DynamicTable
      :data="users"
      :columns="columns"
      :loading="loading"
      @row-click="showUser"
      class="overflow-x-auto"
    >
      <template #actions>
        <Column header="Actions">
          <template #body="{ data }">
            <Button
              icon="pi pi-search"
              label="View"
              size="small"
              @click.stop="showUser({ data })"
            />
          </template>
        </Column>
      </template>
    </DynamicTable>
  </div>

  <!-- User details dialog -->
  <Dialog
    v-model:visible="UserDetailsDialogVisible"
    modal
    :header="t('users.details')"
    :style="{ width: '90vw', maxWidth: '500px' }"
    class="custom-dialog"
  >
    <div v-if="selectedUser" class="flex flex-col gap-3">
      <div class="flex justify-between"><span>ID</span><span>{{ selectedUser.UID }}</span></div>
      <div class="flex justify-between"><span>{{ t('users.name') }}</span><span>{{ selectedUser.Name }}</span></div>
      <div class="flex justify-between"><span>{{ t('users.lastname') }}</span><span>{{ selectedUser.Lastname }}</span></div>
      <div class="flex justify-between"><span>{{ t('users.email') }}</span><span>{{ selectedUser.Email }}</span></div>
      <div class="flex justify-between"><span>{{ t('users.phone') }}</span><span>{{ selectedUser.PhoneNr }}</span></div>
      <div class="flex justify-between">
      <span>{{ t('users.address') }}</span>
      <span>
          {{ [selectedUser.Street, selectedUser.StreetNr, selectedUser.City].filter(Boolean).join(" ") }}
      </span>
      </div>
      <div class="flex justify-between"><span>{{ t('users.role') }}</span><span>{{ selectedUser.Role }}</span></div>

      <div class="flex justify-end gap-2 mt-4">
        <Button icon="pi pi-key" label="Reset password" outlined @click="openResetDialog" />
        <Button icon="pi pi-pencil" label="Edit" outlined @click="openEditDialog" />
        <Button icon="pi pi-trash" label="Delete" severity="danger" outlined @click="deleteUser" />
      </div>
    </div>
  </Dialog>

<Dialog
  v-model:visible="UserFormDialogVisible"
  modal
  :header="isEditing ? t('common.edit') : t('common.add')"
  :style="{ width: '90vw', maxWidth: '500px' }"
  class="custom-dialog"
>
  <!-- legenda wymaganych pól -->
  <p class="text-xs text-gray-500 mb-3">
    <span class="text-red-500">*</span> {{ t('common.required') || 'required fields' }}
  </p>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Name (required) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.name') }}
        <span class="text-red-500 ml-0.5">*</span>
      </label>
      <InputText v-model="form.Name" class="w-full" required />
    </div>

    <!-- Lastname (optional) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.lastname') }}
      </label>
      <InputText v-model="form.Lastname" class="w-full" />
    </div>

    <!-- Email (required) -->
    <div class="flex flex-col gap-1 md:col-span-2">
      <label class="text-sm font-medium">
        {{ t('users.email') }}
        <span class="text-red-500 ml-0.5">*</span>
      </label>
      <InputText v-model="form.Email" class="w-full" type="email" required />
    </div>

    <!-- Phone (required) -->
    <div class="flex flex-col gap-1 md:col-span-2">
      <label class="text-sm font-medium">
        {{ t('users.phone') }}
        <span class="text-red-500 ml-0.5">*</span>
      </label>
      <InputText v-model="form.PhoneNr" class="w-full" required />
    </div>

    <!-- City (optional) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.city') }}
      </label>
      <InputText v-model="form.City" class="w-full" />
    </div>

    <!-- Street (optional) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.street') }}
      </label>
      <InputText v-model="form.Street" class="w-full" />
    </div>

    <!-- Street number (optional) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.streetnr') }}
      </label>
      <InputText v-model="form.StreetNr" class="w-full" />
    </div>

    <!-- Post number (optional) -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">
        {{ t('users.postnr') }}
      </label>
      <InputText v-model="form.PostNr" class="w-full" />
    </div>

    <!-- Role (required) -->
    <div class="flex flex-col gap-1 md:col-span-2">
      <label class="text-sm font-medium">
        {{ t('users.role') }}
        <span class="text-red-500 ml-0.5">*</span>
      </label>
      <select
        v-model="form.Role"
        class="border rounded-md p-2 w-full"
        required
      >
        <option value="Client">Client</option>
        <option value="Employee">Employee</option>
        <option value="Admin">Admin</option>
      </select>
    </div>
  </div>

  <template #footer>
    <Button :label="t('common.cancel')" outlined @click="UserFormDialogVisible = false" />
    <Button :label="t('common.save')" @click="saveUser" />
  </template>
</Dialog>




  <!-- Reset password dialog -->
  <Dialog
    v-model:visible="ResetPasswordDialogVisible"
    modal
    header="Reset user password"
    :style="{ width: '400px' }"
  >
    <div class="flex flex-col gap-3">
      <p>Enter a new temporary password for {{ selectedUser?.Email }}</p>
      <InputText v-model="tempPassword" type="password" placeholder="Temporary password" />
    </div>
    <template #footer>
      <Button label="Cancel" outlined @click="ResetPasswordDialogVisible = false" />
      <Button label="Reset" severity="warning" @click="resetPassword" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import DynamicTable from "../components/DynamicTable.vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import * as userService from "../services/userService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const users = ref([]);
const loading = ref(true);
const selectedUser = ref(null);
const UserDetailsDialogVisible = ref(false);
const UserFormDialogVisible = ref(false);
const ResetPasswordDialogVisible = ref(false);
const isEditing = ref(false);
const form = ref({});
const tempPassword = ref("");

const columns = computed(() => [
  { field: "UID", header: "ID", sortable: true },
  { field: "Name", header: t("users.name") },
  { field: "Lastname", header: t("users.lastname") },
  { field: "Email", header: t("users.email") },
  { field: "PhoneNr", header: t("users.phone") },
  { field: "Role", header: t("users.role") },
]);

onMounted(fetchUsers);

async function fetchUsers() {
  try {
    loading.value = true;
    const res = await userService.getUsers();
    users.value = Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    toast.add({ severity: "error", summary: "Error", detail: "Could not load users", life: 3000 });
  } finally {
    loading.value = false;
  }
}

function showUser(e) {
  selectedUser.value = e.data;
  UserDetailsDialogVisible.value = true;
}

function openAddDialog() {
  form.value = {
    Name: "",
    Lastname: "",
    Email: "",
    PhoneNr: "",
    City: "",
    Street: "",
    StreetNr: "",
    PostNr: "",
    Role: "Client",
  };
  isEditing.value = false;
  UserFormDialogVisible.value = true;
}


function openEditDialog() {
  if (!selectedUser.value) return;
  form.value = { ...selectedUser.value };
  isEditing.value = true;
  UserDetailsDialogVisible.value = false;
  UserFormDialogVisible.value = true;
}


async function saveUser() {
  try {
    if (isEditing.value) {
      await userService.updateUser(form.value.UID, form.value);
      toast.add({ severity: "success", summary: "Updated", detail: "User updated successfully" });
    } else {
      const res = await userService.addUser(form.value);
      toast.add({
        severity: "success",
        summary: "Added",
        detail: `User added. Temporary password: ${res.tempPassword}`,
        life: 7000,
      });
    }
    UserFormDialogVisible.value = false;
    fetchUsers();
  } catch (err) {
    toast.add({ severity: "error", summary: "Error", detail: err.message });
  }
}

async function deleteUser() {
  try {
    await userService.deleteUser(selectedUser.value.UID);
    toast.add({ severity: "info", summary: "Deleted", detail: "User removed" });
    UserDetailsDialogVisible.value = false;
    fetchUsers();
  } catch (err) {
    toast.add({ severity: "error", summary: "Error", detail: err.message });
  }
}

function openResetDialog() {
  tempPassword.value = "";
  UserDetailsDialogVisible.value = false;
  ResetPasswordDialogVisible.value = true;
}

async function resetPassword() {
  try {
    await userService.resetUserPassword(selectedUser.value.UID, tempPassword.value);
    toast.add({ severity: "success", summary: "Password reset", detail: "Temporary password set." });
    ResetPasswordDialogVisible.value = false;
  } catch (err) {
    toast.add({ severity: "error", summary: "Error", detail: err.message });
  }
}
</script>

<style scoped>
@media (max-width: 640px) {
  .p-dialog {
    margin: 0 !important;
    border-radius: 0 !important;
    height: 100vh !important;
  }
}

.custom-dialog .p-dialog-content {
    padding: 1.5rem !important;
}

.custom-dialog .p-dialog-header {
  padding: 1.2rem 1.5rem !important;
}
</style>
