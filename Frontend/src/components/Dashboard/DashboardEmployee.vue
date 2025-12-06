<template>
  <div class="p-6">

    <h2 class="text-2xl font-bold mb-6">
      {{ t("employee.works_title") }}
    </h2>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-gray-500 py-10">
      <i class="pi pi-spin pi-spinner text-3xl"></i>
      <p class="mt-3">{{ t("common.loading") }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!works.length" class="text-center text-gray-500 py-10">
      {{ t("employee.no_works") }}
    </div>

    <!-- WORK SECTIONS -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">

      <!-- To Do -->
      <div>
        <h3 class="text-lg font-semibold mb-3">
          {{ t("employee.todo") }}
          <Tag severity="warning" class="ml-2">{{ todoWorks.length }}</Tag>
        </h3>

        <div class="flex flex-col gap-3">
          <WorkCard
            v-for="work in todoWorks"
            :key="work.WID"
            :work="work"
            @open="openDetails"
          />
        </div>
      </div>

      <!-- In Progress -->
      <div>
        <h3 class="text-lg font-semibold mb-3">
          {{ t("employee.inprogress") }}
          <Tag severity="info" class="ml-2">{{ progressWorks.length }}</Tag>
        </h3>

        <div class="flex flex-col gap-3">
          <WorkCard
            v-for="work in progressWorks"
            :key="work.WID"
            :work="work"
            @open="openDetails"
          />
        </div>
      </div>

      <!-- Done -->
      <div>
        <h3 class="text-lg font-semibold mb-3">
          {{ t("employee.done") }}
          <Tag severity="success" class="ml-2">{{ doneWorks.length }}</Tag>
        </h3>

        <div class="flex flex-col gap-3 opacity-70">
          <WorkCard
            v-for="work in doneWorks"
            :key="work.WID"
            :work="work"
            @open="openDetails"
          />
        </div>
      </div>

    </div>

    <!-- Details Dialog -->
    <Dialog
      v-model:visible="showDetails"
      modal
      :header="t('employee.details')"
      :style="{ width: '500px' }"
    >
      <div v-if="selected">
        <p><strong>{{ t("employee.id") }}:</strong> {{ selected.WID }}</p>
        <p><strong>{{ t("employee.boat") }}:</strong> {{ selected.Boat?.name }}</p>

        <p v-if="selected.Boat?.Boathall">
          <strong>{{ t("employee.hall") }}:</strong>
          Hall {{ selected.Boat.Boathall.BHID }}
          ({{ selected.Boat.Boathall.Length }}×{{ selected.Boat.Boathall.Width }})
        </p>

        <p><strong>{{ t("employee.service") }}:</strong> {{ selected.Service?.Name }}</p>

        <p>
          <strong>{{ t("employee.comment") }}:</strong><br />
          {{ selected.Comment || "—" }}
        </p>

        <p>
          <strong>{{ t("employee.status") }}:</strong>
          <Tag :value="selected.State" :severity="stateColor(selected.State)" />
        </p>

        <div class="mt-4 flex justify-end">
          <Button
            icon="pi pi-arrow-right"
            :label="t('employee.open_boat')"
            @click="goToBoat(selected.BID)"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

import { getEmployeeWorks } from "../../services/workService";
import WorkCard from "../WorkCard.vue";

const { t } = useI18n({ useScope: "global" });
const router = useRouter();
const toast = useToast();

const works = ref([]);
const loading = ref(true);

const showDetails = ref(false);
const selected = ref(null);

onMounted(async () => {
  try {
    works.value = await getEmployeeWorks();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: t("employee.load_failed"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
});

const todoWorks = computed(() =>
  works.value.filter(w => w.State === "ToDo")
);
const progressWorks = computed(() =>
  works.value.filter(w => w.State === "InProgress")
);
const doneWorks = computed(() =>
  works.value.filter(w => w.State === "Done")
);

function goToBoat(id) {
  router.push(`/home/boats/${id}`);
}

function openDetails(work) {
  selected.value = work;
  showDetails.value = true;
}

function stateColor(state) {
  switch (state) {
    case "Done": return "success";
    case "InProgress": return "info";
    case "ToDo": return "warning";
    default: return null;
  }
}
</script>
