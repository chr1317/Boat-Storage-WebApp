<template>
  <div class="p-6 flex flex-col gap-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
      <h2 class="text-2xl font-semibold">{{ t("hall.title") }}</h2>

      <Button
        icon="pi pi-plus"
        :label="t('hall.add')"
        severity="primary"
        class="w-full sm:w-auto"
        @click="openAddDialog"
      />
    </div>

    <!-- GRID OF HALL CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card
        v-for="hall in halls"
        :key="hall.BHID"
        class="shadow-sm hover:shadow-md transition cursor-pointer"
        @click="openHall(hall)"
      >
        <template #title>
          <div class="flex justify-between items-center">
            <span class="font-semibold text-lg">{{ hall.Name || ('Hall ' + hall.BHID) }}</span>
          </div>
        </template>

        <template #content>
          <p class="text-sm">
            <strong>{{ t('hall.dimensions') }}:</strong>
            {{ hall.Length }} × {{ hall.Width }} cm
          </p>

          <p class="text-sm mt-1">
            <strong>{{ t('hall.boats') }}:</strong>
            {{ hall.boatsCount }}
          </p>
        </template>

        <template #footer>
  <div class="flex flex-col gap-2">
    <Button
      icon="pi pi-map"
      label="Open map"
      size="small"
      class="w-full"
      @click.stop="openHall(hall)"
    />
    <Button
      icon="pi pi-trash"
      label="Delete"
      severity="danger"
      size="small"
      class="w-full"
      @click.stop="confirmDelete(hall)"
    />
  </div>
</template>

      </Card>
    </div>

    <!-- DIALOG: ADD/EDIT HALL -->
    <Dialog
  v-model:visible="formDialog"
  modal
  :header="t('hall.add')"
  :style="{ width: '90vw', maxWidth: '480px' }"
  class="custom-dialog"
>
  <div class="flex flex-col gap-6 p-4">


    <div class="flex flex-col gap-2">
      <label class="block text-sm font-medium">{{ t("hall.name") }}</label>
      <InputText v-model="form.Name" class="w-full h-12 text-base" />
    </div>


    <div class="flex flex-col gap-2">
      <label class="block text-sm font-medium">{{ t("hall.width") }} (cm)</label>
      <InputNumber v-model="form.Width" class="w-full h-12 text-base" />
    </div>


    <div class="flex flex-col gap-2">
      <label class="block text-sm font-medium">{{ t("hall.length") }} (cm)</label>
      <InputNumber v-model="form.Length" class="w-full h-12 text-base" />
    </div>


    <div class="flex flex-col gap-2">
      <label class="block text-sm font-medium">{{ t("hall.height") }} (cm)</label>
      <InputNumber v-model="form.Height" class="w-full h-12 text-base" />
    </div>


    <div class="flex flex-col gap-2">
      <label class="block text-sm font-medium">{{ t("hall.margin") }} (cm)</label>
      <InputNumber v-model="form.Margin" class="w-full h-12 text-base" />
    </div>

  </div>

  <template #footer>
    <div class="flex justify-end gap-3 px-4 py-3">
      <Button label="Cancel" outlined class="h-11 px-6" @click="formDialog = false" />
      <Button label="Save" class="h-11 px-6" @click="saveHall" />
    </div>
  </template>
</Dialog>

<Dialog
  v-model:visible="deleteDialog"
  modal
  header="Delete hall"
  :style="{ width: '350px' }"
  class="custom-dialog"
>
  <p>Are you sure you want to delete <strong>{{ hallToDelete?.Name }}</strong>?</p>

  <template #footer>
    <Button label="Cancel" outlined @click="deleteDialog = false" />
    <Button label="Delete" severity="danger" @click="deleteHall" />
  </template>
</Dialog>



  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";

import { getBoathalls, createBoathall, deleteBoathall } from "../services/boathallService";
import { getBoats } from "../services/boatService";

const router = useRouter();
const toast = useToast();
const { t } = useI18n({ useScope: "global" });

const halls = ref([]);
const formDialog = ref(false);

const deleteDialog = ref(false);
const hallToDelete = ref(null);


const form = ref({
  Name: "",
  Width: null,
  Length: null,
  Height: null,   
  Margin: null,   
});


onMounted(loadHalls);

async function loadHalls() {
  const hallList = await getBoathalls();
  const boats = await getBoats();

  halls.value = hallList.map(h => ({
    ...h,
    boatsCount: boats.filter(b => b.BHID === h.BHID).length,
  }));
}

function openAddDialog() {
  form.value = { Name: "", Width: null, Length: null };
  formDialog.value = true;
}

function confirmDelete(hall) {
  hallToDelete.value = hall;
  deleteDialog.value = true;
}

async function deleteHall() {
  try {
    await deleteBoathall(hallToDelete.value.BHID);

    toast.add({
      severity: "success",
      summary: t("hall.deleted"),
      life: 2000
    });

    deleteDialog.value = false;
    await loadHalls();
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete hall",
      life: 3000
    });
  }
}



async function saveHall() {
  try {
    await createBoathall({
  Name: form.value.Name,
  Width: form.value.Width,
  Length: form.value.Length,
  Height: form.value.Height,
  MarginCM: form.value.Margin,
});


    toast.add({ severity: "success", summary: t("hall.created"), life: 2000 });
    formDialog.value = false;
    await loadHalls();
  } catch (err) {
    toast.add({ severity: "error", summary: "Error", life: 3000 });
  }
}

function openHall(hall) {
  router.push(`/home/halls/${hall.BHID}`);
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
