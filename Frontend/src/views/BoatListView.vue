<template>
  <div class="p-6">
    <div class="flex justify-between mb-4 items-center">
      <h2 class="text-2xl font-semibold">Boat List</h2>

      <Button
        v-if="isStaff"
        label="Add boat"
        icon="pi pi-plus"
        @click="showAddDialog = true"
      />
    </div>

    <DynamicTable
      :data="boats"
      :columns="columns"
      :loading="loading"
      @row-click="goToBoat"
    >
      <template #actions>
        <Column header="Actions" style="width: 220px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button
                icon="pi pi-search"
                label="View"
                size="small"
                @click.stop="goToBoat({ data })"
              />

              <Button
                icon="pi pi-trash"
                label="Delete"
                severity="danger"
                size="small"
                @click.stop="openDeleteDialog(data)"
              />
            </div>
          </template>
        </Column>
      </template>
    </DynamicTable>

    <!-- ADD BOAT DIALOG -->
    <AddBoatDialog
      v-model:visible="showAddDialog"
      @created="reloadBoats"
    />

    <Dialog
      v-model:visible="deleteDialogVisible"
      header="Delete boat"
      :modal="true"
      :style="{ width: '450px' }"
      class="custom-dialog"
    >
      <p class="mb-4">
        Are you sure you want to delete boat
        <strong>"{{ boatToDelete?.name }}"</strong>
        (ID: {{ boatToDelete?.BID }})?
      </p>

      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          @click="cancelDelete"
        />
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          @click="confirmDelete"
        />
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";

import { useAuthStore } from "../stores/auth";
import { getBoats, deleteBoat } from "../services/boatService";

import DynamicTable from "../components/DynamicTable.vue";
import AddBoatDialog from "../components/Boat/AddBoatDialog.vue";

const boats = ref([]);
const loading = ref(true);
const showAddDialog = ref(false);

const deleteDialogVisible = ref(false);
const boatToDelete = ref(null);

const toast = useToast();
const router = useRouter();
const auth = useAuthStore();

const isStaff = computed(
  () => auth.role === "Admin" || auth.role === "Employee"
);

const columns = [
  { field: "BID", header: "ID", sortable: true, width: "80px" },
  { field: "name", header: "Name" },
  { field: "HIN", header: "HIN" },
  { field: "Type", header: "Type" },
  { field: "Drive", header: "Drive" },
  { field: "User.Name", header: "Owner" },
];

onMounted(reloadBoats);

async function reloadBoats() {
  try {
    loading.value = true;
    boats.value = await getBoats();
  } finally {
    loading.value = false;
  }
}

function goToBoat(event) {
  const id = event.data.BID;
  router.push(`/home/boats/${id}`);
}

function openDeleteDialog(boat) {
  boatToDelete.value = boat;
  deleteDialogVisible.value = true;
}

function cancelDelete() {
  deleteDialogVisible.value = false;
  boatToDelete.value = null;
}

async function confirmDelete() {
  if (!boatToDelete.value) return;

  try {
    await deleteBoat(boatToDelete.value.BID);

    toast.add({
      severity: "success",
      summary: "Boat deleted",
      detail: `Boat "${boatToDelete.value.name}" has been removed.`,
      life: 2500,
    });

    deleteDialogVisible.value = false;
    boatToDelete.value = null;
    reloadBoats();
  } catch (err) {
    console.error(err);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete boat.",
      life: 3000,
    });
  }
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