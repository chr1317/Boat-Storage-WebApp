<template>
  <div class="p-4">
    <component :is="component" />
  </div>
</template>

<script setup>
import { computed } from "vue"
import { useAuthStore } from "../stores/auth"

import DashboardAdmin from "../components/Dashboard/DashboardAdmin.vue"
import DashboardEmployee from "../components/Dashboard/DashboardEmployee.vue"
import DashboardClient from "../components/Dashboard/DashboardClient.vue"

const auth = useAuthStore()

const component = computed(() => {
  switch (auth.role) {
    case "Admin":
      return DashboardAdmin
    case "Employee":
      return DashboardEmployee
    case "Client":
      return DashboardClient
    default:
      return DashboardClient
  }
})
</script>
