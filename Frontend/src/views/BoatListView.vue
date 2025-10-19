<template>
  <div class="p-6">
    <h2 class="text-2xl font-semibold mb-4">Boat List</h2>

    <DynamicTable
      :data="boats"
      :columns="columns"
      :loading="loading"
      @row-click="goToBoat"
    >
      <template #actions>
        <Column header="Actions">
          <template #body="{ data }">
            <Button
              icon="pi pi-search"
              label="View"
              size="small"
              @click.stop="goToBoat({ data })"
            />
          </template>
        </Column>
      </template>
    </DynamicTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { getAllBoats } from "../services/boatService";
import DynamicTable from "../components/DynamicTable.vue";
import Button from "primevue/button";

const boats = ref([]);
const loading = ref(true);
const toast = useToast();
const router = useRouter();

const columns = [
  { field: "BID", header: "ID", sortable: true, width: "80px" },
  { field: "name", header: "Name" },
  { field: "HIN", header: "HIN" },
  { field: "Type", header: "Type" },
  { field: "Drive", header: "Drive" },
  { field: "User.Name", header: "Owner" },
];

onMounted(async () => {
  try {
    boats.value = await getAllBoats();
  } catch (err) {
    console.error(err);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Could not load boats",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
});

function goToBoat(event) {
  const id = event.data.BID;
  router.push(`/boats/${id}`);
}
</script>
