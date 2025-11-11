<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('boat.addWork')"
    :style="{ width: '600px' }"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else class="flex flex-col gap-4">
      <!-- Service selector -->
<div>
  <label class="font-semibold block mb-1">{{ t('boat.select_service') }}</label>
  <Dropdown
  v-model="selectedService"
  :options="availableServices"
  optionLabel="Name"
  optionValue="SID"
  placeholder="Start typing to search service"
  class="w-full"
  filter
  filterPlaceholder="Type to filter"
  :virtualScrollerOptions="{ itemSize: 38 }"
>
  <template #option="{ option }">
    <div class="flex justify-between items-center w-full px-1">
      <span class="truncate">{{ option.Name }}</span>
      <small class="text-gray-400 ml-2">{{ option.Part }}</small>
    </div>
  </template>
</Dropdown>

</div>


      <!-- Comment -->
      <div>
        <label class="font-semibold block mb-1">{{ t('boat.comment') }}</label>
        <Textarea v-model="comment" rows="3" class="w-full" autoResize />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="emit('update:visible', false)" />
      <Button label="Save" @click="save" :disabled="!selectedService" />
    </template>
  </Dialog>
  
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import { getServices } from "../../services/serviceService";
import { createWork } from "../../services/workService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const props = defineProps({
  visible: Boolean,
  boatId: { type: Number, required: true },
  seasonId: { type: Number, required: true },
  userId: { type: Number, required: true },
});

const emit = defineEmits(["update:visible", "created"]);

const loading = ref(false);
const availableServices = ref([]);
const selectedService = ref(null);
const comment = ref("");

onMounted(loadServices);

async function loadServices() {
  try {
    loading.value = true;
    availableServices.value = await getServices();
  } catch {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: t("boat.load_services_error"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!selectedService.value) return;
  try {
    loading.value = true;

    await createWork({
      SID: selectedService.value,
      BID: props.boatId,
      seasonID: props.seasonId,
      UID: props.userId,
      Comment: comment.value || "Created via frontend",
      State: "ToDo",
    });

    toast.add({
      severity: "success",
      summary: t("boat.work_created"),
      life: 2000,
    });

    emit("created");
    emit("update:visible", false);
  } catch (err) {
    console.error(err);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: t("boat.create_error"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}
</script>
