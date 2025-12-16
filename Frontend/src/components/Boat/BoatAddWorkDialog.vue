<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('boat.addWork')"
    :style="{ width: '600px' }"
    class="custom-dialog"
    @update:visible="val => emit('update:visible', val)"
  >
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else class="flex flex-col gap-4">

      <!-- 🔹 Select SERVICE -->
      <div>
        <label class="font-semibold block mb-1">{{ t('boat.select_service') }}</label>

        <Dropdown
          v-model="form.SID"
          :options="services"
          optionLabel="Name"
          optionValue="SID"
          placeholder="Select service"
          class="w-full"
          filter
        />
      </div>

      <!-- 🔹 Select WORKER -->
      <div>
        <label class="font-semibold block mb-1">{{ t('boat.select_worker') }}</label>

        <Dropdown
          v-model="form.UID"
          :options="workers"
          optionLabel="Name"
          optionValue="UID"
          placeholder="Choose worker"
          class="w-full"
          filter
        >
          <template #option="{ option }">
            <div class="flex justify-between w-full">
              <span>{{ option.Name }} {{ option.Lastname }}</span>
              <small class="text-gray-400">{{ option.Role }}</small>
            </div>
          </template>
        </Dropdown>
      </div>

      <!-- 🔹 Comment -->
      <div>
        <label class="font-semibold block mb-1">{{ t('boat.comment') }}</label>
        <Textarea v-model="form.Comment" rows="3" class="w-full" autoResize />
      </div>

      <!-- 🔹 Hours (optional) -->
      <div>
        <label class="font-semibold block mb-1">Hours (optional)</label>
        <InputNumber v-model="form.HR" class="w-full" />
      </div>

    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="emit('update:visible', false)" />
      <Button
        label="Save"
        @click="save"
        :disabled="!form.SID || !form.UID"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

import { getServices } from "../../services/serviceService";
import { getUsers } from "../../services/userService";
import { createWorkForStorage } from "../../services/workService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const props = defineProps({
  visible: Boolean,
  AID: { type: Number, required: true },
});

const emit = defineEmits(["update:visible", "created"]);

const loading = ref(false);
const services = ref([]);
const workers = ref([]);

const form = ref({
  SID: null,
  UID: null,
  Comment: "",
  HR: null,
});

onMounted(loadData);

async function loadData() {
  try {
    loading.value = true;

    services.value = await getServices();

    const users = await getUsers();
    workers.value = users.filter(u => ["Admin", "Employee"].includes(u.Role));

  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error loading data",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.value.SID || !form.value.UID) return;

  try {
    loading.value = true;

    await createWorkForStorage(props.AID, {
      SID: form.value.SID,
      UID: form.value.UID,
      Comment: form.value.Comment || "",
      HR: form.value.HR || null,
      State: "ToDo",
    });

    toast.add({
      severity: "success",
      summary: t("boat.work_created"),
      life: 2000,
    });

    emit("created");
    emit("update:visible", false);

    form.value = { SID: null, UID: null, Comment: "", HR: null };

  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error creating work",
      life: 3000,
    });
  } finally {
    loading.value = false;
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