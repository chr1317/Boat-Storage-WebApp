<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('works.details')"
    :style="{ width: '600px' }"
    @update:visible="val => emit('update:visible', val)"
  >
    <div v-if="work" class="flex flex-col gap-4">

      <!-- Service -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.service") }}</span>
        <span>{{ work.Service?.Name || "—" }}</span>
      </div>

      <!-- Boat -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.boat") }}</span>
        <span>{{ work.Boat?.name || "—" }}</span>
      </div>

      <!-- Worker -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.worker") }}</span>
        <span>{{ work.User?.Name || "—" }}</span>
      </div>

      <!-- Date -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.date") }}</span>
        <span>{{ formatDate(work.Date) }}</span>
      </div>

      <!-- Hours -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.hours") }}</span>
        <span>{{ work.HR || "—" }}</span>
      </div>

      <!-- Comment -->
      <div>
        <span class="font-semibold">{{ t("works.comment") }}</span>
        <p class="mt-1 whitespace-pre-line">
          {{ work.Comment || "—" }}
        </p>
      </div>

      <!-- Status -->
      <div class="flex justify-between">
        <span class="font-semibold">{{ t("works.status") }}</span>
        <Tag
          :value="work.State"
          :severity="getStateColor(work.State)"
        />
      </div>

      <!-- Subtasks -->
      <div v-if="work.subtasks?.length" class="mt-4">
        <h4 class="font-semibold mb-2">{{ t("works.subTasks") }}</h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="s in work.subtasks"
            :key="s.WID"
            class="p-2 border rounded bg-gray-50"
          >
            <div class="flex justify-between">
              <span>{{ s.Service?.Name }}</span>
              <Tag :value="s.State" :severity="getStateColor(s.State)" />
            </div>
            <div class="text-sm text-gray-600">
              {{ formatDate(s.Date) }}
            </div>
            <div class="text-sm">
              {{ s.Comment || "—" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end gap-2 mt-4">
        <Button label="Close" outlined @click="close" />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Tag from "primevue/tag";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  work: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["update:visible", "refresh"]);

const { t } = useI18n({ useScope: "global" });

function close() {
  emit("update:visible", false);
}

function formatDate(date) {
  return date ? new Date(date).toLocaleDateString() : "—";
}

function getStateColor(s) {
  return {
    Done: "success",
    InProgress: "info",
    ToDo: "warning"
  }[s] || null;
}
</script>
