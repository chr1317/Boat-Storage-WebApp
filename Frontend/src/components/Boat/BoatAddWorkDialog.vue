<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('boat.addWork')"
    :style="{ width: '600px' }"
    @update:visible="val => emit('update:visible', val)"
  >
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- 🔹 Select BOAT (Tylko jeśli boatId NIE przekazany) -->
      <div v-if="!props.boatId">
        <label class="font-semibold block mb-1">{{ t('boat.select_boat') }}</label>

        <Dropdown
          v-model="selectedBoat"
          :options="boats"
          optionLabel="name"
          optionValue="BID"
          filter
          placeholder="Choose boat"
          class="w-full"
        >
          <template #option="{ option }">
  <div class="flex justify-between items-center w-full px-1">
    <span class="truncate">
      {{ option.name }}
    </span>
    <small class="text-gray-400 ml-2 truncate">
      ID: {{ option.BID }}
      • Owner: {{ option.User?.Name }} {{ option.User?.Lastname }}
    </small>
  </div>
</template>

        </Dropdown>
      </div>

      <!-- 🔹 Select SERVICE -->
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
              <small class="text-gray-400">{{ option.Part }}</small>
            </div>
          </template>
        </Dropdown>
      </div>

      <!-- 🔹 Comment -->
      <div>
        <label class="font-semibold block mb-1">{{ t('boat.comment') }}</label>
        <Textarea v-model="comment" rows="3" class="w-full" autoResize />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="emit('update:visible', false)" />
      <Button
        label="Save"
        @click="save"
        :disabled="!selectedService || (!props.boatId && !selectedBoat)"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import { getServices } from "../../services/serviceService";
import { getBoats } from "../../services/boatService";
import { createWork } from "../../services/workService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const props = defineProps({
  visible: Boolean,
  boatId: { type: Number, required: false },
  seasonId: { type: Number, required: false }, // może być null
  userId: { type: Number, required: true },
});

const emit = defineEmits(["update:visible", "created"]);

const loading = ref(false);
const boats = ref([]);
const selectedBoat = ref(null);

const availableServices = ref([]);
const selectedService = ref(null);
const comment = ref("");

onMounted(loadData);

async function loadData() {
  try {
    loading.value = true;

    availableServices.value = await getServices();

    if (!props.boatId) {
      boats.value = await getBoats();
    }

  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: t("boat.load_error"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  const BID = props.boatId || selectedBoat.value;

  if (!BID || !selectedService.value) return;

  try {
    loading.value = true;

    await createWork({
      SID: selectedService.value,
      BID,
      seasonID: props.seasonId || null,
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
