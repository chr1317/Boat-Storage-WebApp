<template>
  <div class="bg-surface-100 dark:bg-surface-700 p-6 border-b border-surface-200 dark:border-surface-600 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
    <div>
      <h2 class="text-2xl font-semibold text-primary">{{ boat.name }}</h2>
      <p class="text-sm text-muted">
        {{ boat.Type }} • {{ boat.Drive }}
        <span v-if="boat.HIN" class="ml-2">({{ boat.HIN }})</span>
      </p>
    </div>
    <div class="text-sm text-right">
      <p><i class="pi pi-user mr-1"></i>{{ boat.User?.Name || "No owner" }}</p>
      <p v-if="boat.User?.Email" class="text-muted">{{ boat.User.Email }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ boat: Object });
</script>
