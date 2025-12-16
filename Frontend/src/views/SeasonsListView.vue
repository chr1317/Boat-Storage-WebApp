<template>
  <div class="p-6 flex flex-col gap-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold">
        {{ t("season.list_title") }}
      </h2>

      <Button
        icon="pi pi-plus"
        :label="t('season.add')"
        @click="openDialog"
      />
    </div>

    <!-- TABLE -->
    <DataTable
      :value="seasons"
      stripedRows
      class="shadow-md rounded-lg"
    >
      <Column field="year_start" :header="t('season.year_start')" />
      <Column field="year_end" :header="t('season.year_end')" />
      <Column :header="t('season.label')">
        <template #body="{ data }">
          {{ data.year_start }}/{{ data.year_end }}
        </template>
      </Column>
    </DataTable>

    <!-- ADD DIALOG -->
    <Dialog
      v-model:visible="dialog"
      modal
      :header="t('season.add')"
      style="width: 420px"
      class="custom-dialog"
    >
      <div class="flex flex-col gap-4">

        <!-- START YEAR -->
        <Dropdown
          v-model="startYear"
          :options="availableStartYears"
          :placeholder="t('season.choose_start_year')"
        />

        <!-- END YEAR (READ ONLY) -->
        <InputText
          :value="endYear"
          disabled
        />

        <!-- ERROR -->
        <small v-if="seasonExists" class="text-red-500">
          {{ t("season.already_exists") }}
        </small>

        <div class="flex justify-end gap-2">
          <Button
            :label="t('common.cancel')"
            outlined
            @click="dialog = false"
          />
          <Button
            :label="t('common.create')"
            icon="pi pi-check"
            severity="success"
            :disabled="!canCreate"
            @click="createSeasonFunction"
          />
        </div>
      </div>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";

import { getSeasons, createSeason } from "../services/seasonService";

const { t } = useI18n();

const seasons = ref([]);
const dialog = ref(false);

const startYear = ref(null);

/* LOAD */
onMounted(async () => {
  seasons.value = await getSeasons();
});

/* YEARS */
const currentYear = new Date().getFullYear();

/**
 * np. 2024 → tworzy sezon 2024/2025
 */
const availableStartYears = computed(() => {
  const years = [];
  for (let y = currentYear - 2; y <= currentYear + 5; y++) {
    years.push(y);
  }
  return years;
});

const endYear = computed(() =>
  startYear.value ? startYear.value + 1 : "-"
);

/* CHECKS */
const seasonExists = computed(() => {
  if (!startYear.value) return false;
  return seasons.value.some(
    s =>
      s.year_start === startYear.value &&
      s.year_end === startYear.value + 1
  );
});

const canCreate = computed(() =>
  startYear.value && !seasonExists.value
);

/* ACTIONS */
function openDialog() {
  startYear.value = null;
  dialog.value = true;
}

async function createSeasonFunction() {
  await createSeason({
    year_start: startYear.value,
    year_end: startYear.value + 1,
  });

  dialog.value = false;
  seasons.value = await getSeasons();
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

