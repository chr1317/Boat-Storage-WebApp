<template>
  <div class="p-6 flex flex-col gap-4">

    <!-- HEADER -->
    <div class="flex justify-between items-center flex-wrap gap-3">
      <h2 class="text-2xl font-bold">
        {{ t("services.history_title") }}
      </h2>

      <Button
        icon="pi pi-file-pdf"
        severity="danger"
        outlined
        :label="t('common.export_pdf')"
        @click="exportPdf"
        :disabled="filteredWorks.length === 0"
      />
    </div>

    <!-- FILTERS -->
    <Card>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">

          <!-- EMPLOYEE -->
          <Dropdown
            v-model="filters.employee"
            :options="employees"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('services.filter_employee')"
            clearable
          />

          <!-- YEAR -->
          <Dropdown
            v-model="filters.year"
            :options="years"
            :placeholder="t('services.filter_year')"
            clearable
          />

          <!-- MONTH -->
          <Dropdown
            v-model="filters.month"
            :options="months"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('services.filter_month')"
            clearable
          />

          <!-- EXACT DATE -->
          <Calendar
            v-model="filters.date"
            dateFormat="dd.mm.yy"
            showIcon
            :placeholder="t('services.filter_date')"
          />

        </div>
        <div class="flex justify-end mt-3">
  <Button
    icon="pi pi-times"
    outlined
    severity="secondary"
    :label="t('common.clear_filters')"
    @click="clearFilters"
  />
</div>
      </template>
    </Card>

    <!-- TABLE -->
    <DataTable
      :value="filteredWorks"
      stripedRows
      paginator
      :rows="15"
      sortMode="multiple"
      responsiveLayout="scroll"
      class="shadow-md rounded-lg"
    >

      <Column field="Date" :header="t('common.date')" sortable>
        <template #body="{ data }">
          {{ formatDate(data.Date) }}
        </template>
      </Column>

      <Column field="serviceName" :header="t('services.service')" sortable />

      <Column field="employeeName" :header="t('services.employee')" sortable />

      <Column field="HR" :header="t('services.hours')" sortable />

      <Column field="State" :header="t('common.status')" sortable />

      <Column :header="t('services.comment')">
        <template #body="{ data }">
          <span class="text-sm text-gray-600">
            {{ data.Comment || "-" }}
          </span>
        </template>
      </Column>

    </DataTable>

    <!-- EMPTY -->
    <div
      v-if="!loading && filteredWorks.length === 0"
      class="text-center text-gray-500 py-10"
    >
      {{ t("services.no_results") }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

import { getFullServiceHistory } from "../services/workService";
import { getBoat } from "../services/boatService";
import { exportWorksToPdf } from "../utils/pdfExporter";

const { t } = useI18n();
const route = useRoute();

const BID = Number(route.params.id);

const boat = ref(null);

const loading = ref(true);
const works = ref([]);

const filters = ref({
  employee: null,
  year: null,
  month: null,
  date: null
});

onMounted(async () => {
  loading.value = true;
  works.value = await getFullServiceHistory(BID);
  console.log(works.value);
  boat.value = await getBoat(BID);
  loading.value = false;
});

const employees = computed(() => {
  const map = new Map();

  works.value.forEach(w => {
    if (w.employeeName) {
      const id = w.employeeID ?? w.employeeName;
      map.set(id, w.employeeName);
    }
  });

  return [...map.entries()].map(([value, label]) => ({
    value,
    label
  }));
});


const years = computed(() => {
  const set = new Set();

  works.value.forEach(w => {
    if (!w.Date) return;
    const d = new Date(w.Date);
    if (!isNaN(d)) {
      set.add(d.getFullYear());
    }
  });

  return [...set].sort((a, b) => b - a);
});


const months = [
  { label: t("months.january"), value: 0 },
  { label: t("months.february"), value: 1 },
  { label: t("months.march"), value: 2 },
  { label: t("months.april"), value: 3 },
  { label: t("months.may"), value: 4 },
  { label: t("months.june"), value: 5 },
  { label: t("months.july"), value: 6 },
  { label: t("months.august"), value: 7 },
  { label: t("months.september"), value: 8 },
  { label: t("months.october"), value: 9 },
  { label: t("months.november"), value: 10 },
  { label: t("months.december"), value: 11 }
];

const filteredWorks = computed(() => {
  return works.value.filter(w => {
    const d = new Date(w.Date);

    if (filters.value.employee && w.employeeID !== filters.value.employee)
      return false;

    if (filters.value.year && d.getFullYear() !== filters.value.year)
      return false;

    if (filters.value.month !== null && d.getMonth() !== filters.value.month)
      return false;

    if (filters.value.date && !sameDay(d, filters.value.date)) {
      return false;
    }


    return true;
  });
});

function clearFilters() {
  filters.value = {
    employee: null,
    year: null,
    month: null,
    date: null
  };
}


function formatDate(d) {
      if (!d) {
    return "-";
  }

  return new Date(d).toLocaleDateString();
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


function buildFiltersText() {
  const parts = [];

  if (filters.value.employee) {
    const emp = employees.value.find(
      e => e.value === filters.value.employee
    );
    if (emp) {
      parts.push(`${t("services.employee")}: ${emp.label}`);
    }
  }

  if (filters.value.year) {
    parts.push(`${t("common.year")}: ${filters.value.year}`);
  }

  if (filters.value.month !== null) {
    const m = months.find(m => m.value === filters.value.month);
    if (m) {
      parts.push(`${t("common.month")}: ${m.label}`);
    }
  }

  if (filters.value.date) {
    parts.push(
      `${t("common.date")}: ${filters.value.date.toLocaleDateString()}`
    );
  }

  return parts.length
    ? parts.join(" • ")
    : t("common.no_filters");
}


function exportPdf() {
  const owner = boat.value?.User
    ? `${boat.value.User.Name} ${boat.value.User.Lastname || ""}`.trim()
    : "-";

  exportWorksToPdf(filteredWorks.value, t, {
    boatName: boat.value?.name || null,
    boatInfoLine: `${t("boat.hin")}: ${boat.value?.HIN || "-"}   •   ${t("boat.owner")}: ${owner}`,
    filtersText: buildFiltersText(),
  });
}
</script>
