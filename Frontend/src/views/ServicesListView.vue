<template>
  <div class="p-6">
    <!-- 🔹 Header -->
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
      <h2 class="text-2xl font-semibold">{{ t("services.title") }}</h2>

      <Button
        icon="pi pi-plus"
        :label="t('services.add')"
        severity="primary"
        class="w-full sm:w-auto"
        @click="openAddDialog"
      />
    </div>

    <!-- 🔹 Table -->
    <DynamicTable
      :data="services"
      :columns="columns"
      :loading="loading"
      @row-click="showService"
      class="overflow-x-auto"
    >
      <template #actions>
        <Column header="Actions">
          <template #body="{ data }">
            <Button
              icon="pi pi-search"
              label="View"
              size="small"
              @click.stop="showService({ data })"
            />
          </template>
        </Column>
      </template>
    </DynamicTable>
  </div>

  <!-- 🔹 Dialog: Service details -->
  <Dialog
    v-model:visible="ServiceDetailsDialogVisible"
    modal
    header="Service details"
    :style="{ width: '90vw', maxWidth: '500px' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div v-if="selectedService" class="flex flex-col gap-4">
      <div class="flex flex-col gap-3">
        <div class="flex justify-between">
          <span class="font-medium">{{ t("services.id") }}</span>
          <span>{{ selectedService.SID }}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-medium">{{ t("services.part") }}</span>
          <span>{{ selectedService.Part }}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-medium">{{ t("services.name") }}</span>
          <span>{{ selectedService.Name }}</span>
        </div>
      </div>

      <!-- 🔸 Buttons -->
      <div class="flex justify-end gap-2 mt-4">
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
          @click="deleteService"
        />
      </div>
    </div>
  </Dialog>

  <!-- 🔹 Dialog: Add/Edit service -->
  <Dialog
    v-model:visible="ServiceFormDialogVisible"
    modal
    :header="isEditing ? t('services.edit') : t('services.add')"
    :style="{ width: '90vw', maxWidth: '450px' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label class="block mb-1 font-medium">{{ t("services.part") }}</label>
        <InputText v-model="form.Part" placeholder="e.g. Engine" />
      </div>

      <div>
        <label class="block mb-1 font-medium">{{ t("services.name") }}</label>
        <InputText v-model="form.Name" placeholder="e.g. Oil change" />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="ServiceFormDialogVisible = false" />
      <Button label="Save" @click="saveService" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { getServices, createService, updateService, deleteServiceById } from "../services/serviceService";
import DynamicTable from "../components/DynamicTable.vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

// 🔹 state
const services = ref([]);
const loading = ref(true);
const selectedService = ref(null);
const ServiceDetailsDialogVisible = ref(false);
const ServiceFormDialogVisible = ref(false);
const isEditing = ref(false);
const form = ref({ Part: "", Name: "" });

// 🔹 Columns
const columns = computed(() => [
  { field: "SID", header: "ID", sortable: true, width: "80px" },
  { field: "Part", header: t("services.part") },
  { field: "Name", header: t("services.name") },
]);

// 🔹 Load data
onMounted(fetchServices);

async function fetchServices() {
  try {
    loading.value = true;
    const res = await getServices();
    services.value = Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.error("Error loading services:", err);
    toast.add({ severity: "error", summary: "Error", detail: "Could not load services", life: 3000 });
  } finally {
    loading.value = false;
  }
}

// 🔹 Show details
function showService(e) {
  selectedService.value = e.data;
  ServiceDetailsDialogVisible.value = true;
}

// 🔹 Add / Edit dialog
function openAddDialog() {
  form.value = { Part: "", Name: "" };
  isEditing.value = false;
  ServiceFormDialogVisible.value = true;
}

function openEditDialog() {
  if (!selectedService.value) return;
  form.value = { ...selectedService.value };
  isEditing.value = true;
  ServiceDetailsDialogVisible.value = false;
  ServiceFormDialogVisible.value = true;
}

// 🔹 Save (create or update)
async function saveService() {
  try {
    if (isEditing.value) {
      await updateService(form.value.SID, form.value);
      toast.add({ severity: "success", summary: t("services.updated"), life: 2000 });
    } else {
      await createService(form.value);
      toast.add({ severity: "success", summary: t("services.created"), life: 2000 });
    }
    ServiceFormDialogVisible.value = false;
    await fetchServices();
  } catch (err) {
    toast.add({ severity: "error", summary: "Error saving", life: 3000 });
  }
}

// 🔹 Delete
async function deleteService() {
  if (!selectedService.value) return;
  if (!confirm(t("services.confirm_delete"))) return;
  try {
    await deleteServiceById(selectedService.value.SID);
    toast.add({ severity: "success", summary: t("services.deleted"), life: 2000 });
    ServiceDetailsDialogVisible.value = false;
    await fetchServices();
  } catch (err) {
    toast.add({ severity: "error", summary: "Error deleting", life: 3000 });
  }
}
</script>

<style scoped>
/* minimalne poprawki do mobile UX */
@media (max-width: 640px) {
  .p-dialog {
    margin: 0 !important;
    border-radius: 0 !important;
    height: 100vh !important;
  }
}
</style>
