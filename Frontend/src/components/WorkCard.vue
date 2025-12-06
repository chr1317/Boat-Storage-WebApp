<template>
  <Card class="shadow-sm hover:shadow-md transition cursor-pointer" @click="$emit('open', work)">
    <template #title>
      <div class="flex justify-between items-center">
        <span>{{ work.Service?.Name }}</span>
        <Tag :value="work.State" :severity="stateColor(work.State)" />
      </div>
    </template>

    <template #content>
      <p class="text-sm">
        <strong>{{ t("employee.boat") }}:</strong>
        {{ work.Boat?.name }}
      </p>

      <p v-if="work.Boat?.Boathall" class="text-sm">
        <strong>{{ t("employee.hall") }}:</strong>
        Hall {{ work.Boat.Boathall.BHID }}
      </p>

      <p class="text-sm mt-2">
        <strong>{{ t("employee.comment") }}:</strong><br />
        {{ work.Comment || "—" }}
      </p>
    </template>
  </Card>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const props = defineProps({
  work: Object
});

const { t } = useI18n({ useScope: "global" });

function stateColor(state) {
  switch (state) {
    case "Done": return "success";
    case "InProgress": return "info";
    case "ToDo": return "warning";
    default: return null;
  }
}
</script>
