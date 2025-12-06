<template>
  <div class="p-4 space-y-6">

    <!-- HEADER -->
    <h2 class="text-2xl font-semibold">{{ t("problems.title") }}</h2>

    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

      <!-- CARD -->
      <Card class="shadow-md">
        <template #title>{{ t("problems.new") }}</template>
        <template #subtitle>{{ newCount }} {{ t("problems.items") }}</template>
        <template #content>
          <Tag value="New" severity="warning" />
        </template>
      </Card>

      <Card class="shadow-md">
        <template #title>{{ t("problems.inProgress") }}</template>
        <template #subtitle>{{ inProgressCount }} {{ t("problems.items") }}</template>
        <template #content>
          <Tag value="InProgress" severity="info" />
        </template>
      </Card>

      <Card class="shadow-md">
        <template #title>{{ t("problems.resolved") }}</template>
        <template #subtitle>{{ resolvedCount }} {{ t("problems.items") }}</template>
        <template #content>
          <Tag value="Resolved" severity="success" />
        </template>
      </Card>

    </div>

    <!-- RECENT PROBLEMS -->
    <div>
      <h3 class="text-lg font-semibold mb-2">{{ t("problems.recent") }}</h3>

      <div v-if="recentProblems.length" class="space-y-2">

        <Card
          v-for="p in recentProblems"
          :key="p.PID"
          class="p-3 border cursor-pointer hover:shadow"
          @click="goToBoat(p.BID)"
        >
          <template #title>
            {{ p.Description }}
          </template>

          <template #subtitle>
            {{ p.Boat?.name }} — #{{ p.PID }}
          </template>

          <template #content>
            <Tag :value="p.Status" :severity="getStatusColor(p.Status)" />
          </template>
        </Card>

      </div>

      <p v-else class="text-gray-500 text-sm">
        {{ t("problems.empty") }}
      </p>
    </div>

    <!-- FULL TABLE -->
    <div class="mt-6">
      <h3 class="text-lg font-semibold mb-2">{{ t("problems.all") }}</h3>

      <DataTable
        :value="problems"
        :loading="loading"
        dataKey="PID"
        class="p-datatable-sm"
        :paginator="true"
        :rows="10"
        @row-click="goToBoatFromRow"
      >
        <Column field="PID" :header="t('problems.id')" style="width: 80px" />

        <Column field="Boat.name" :header="t('problems.boat')">
          <template #body="{ data }">
            {{ data.Boat?.name || "—" }}
          </template>
        </Column>

        <Column field="Description" :header="t('problems.description')" />

        <Column field="Type" :header="t('problems.type')" style="width: 140px">
          <template #body="{ data }">
            <Tag :value="data.Type" />
          </template>
        </Column>

        <Column field="Status" :header="t('problems.status')" style="width: 140px">
          <template #body="{ data }">
            <Tag :value="data.Status" :severity="getStatusColor(data.Status)" />
          </template>
        </Column>

      </DataTable>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { getProblems } from "../../services/problemService"

const problems = ref([])
const loading = ref(false)
const router = useRouter()
const { t } = useI18n({ useScope: "global" })

onMounted(async () => {
  loading.value = true
  try {
    problems.value = await getProblems()
  } finally {
    loading.value = false
  }
})

// SUMMARY COUNTS
const newCount = computed(() => problems.value.filter(p => p.Status === "New").length)
const inProgressCount = computed(() => problems.value.filter(p => p.Status === "InProgress").length)
const resolvedCount = computed(() => problems.value.filter(p => p.Status === "Resolved").length)

// RECENT PROBLEMS (3 latest)
const recentProblems = computed(() =>
  [...problems.value]
    .sort((a, b) => b.PID - a.PID)
    .slice(0, 3)
)

function goToBoat(id) {
  router.push(`/home/boats/${id}`)
}

function goToBoatFromRow(event) {
  goToBoat(event.data.BID)
}

function getStatusColor(status) {
  switch (status) {
    case "Resolved": return "success"
    case "InProgress": return "info"
    case "New": return "warning"
    default: return null
  }
}
</script>
