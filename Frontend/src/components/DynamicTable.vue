<template>
  <DataTable
    :value="data"
    :paginator="paginator"
    :rows="rows"
    :loading="loading"
    :rowsPerPageOptions="[5, 10, 20, 50]"
    removableSort
    class="p-datatable-sm"
  >
    <Column
      v-for="col in columns"
      :key="col.field"
      :field="col.field"
      :header="col.header"
      :sortable="col.sortable ?? true"
      :filter="col.filter ?? true"
      :style="{ width: col.width || 'auto' }"
    >
      <template v-if="col.body" #body="slotProps">
        {{ col.body(slotProps.data) }}
      </template>
    </Column>

    <slot name="actions"></slot>
  </DataTable>
</template>

<script setup>
import DataTable from "primevue/datatable";
import Column from "primevue/column";

defineProps({
  data: { type: Array, required: true },
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  paginator: { type: Boolean, default: true },
  rows: { type: Number, default: 10 },
});
</script>
