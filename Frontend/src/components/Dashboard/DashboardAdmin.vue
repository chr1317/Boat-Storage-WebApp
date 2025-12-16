<template>
  <div class="p-4 space-y-8">

    <!-- PROBLEMS SUMMARY -->
    <section>
      <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">
        {{ t("problems.overview") }}
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card class="shadow-sm">
          <template #title>{{ t("problems.new") }}</template>
          <template #subtitle>
            {{ newCount }} {{ t("problems.items") }}
          </template>
          <template #content>
            <Tag :value="t('problems.new')" severity="warning" />
          </template>
        </Card>

        <Card class="shadow-sm">
          <template #title>{{ t("problems.inProgress") }}</template>
          <template #subtitle>
            {{ inProgressCount }} {{ t("problems.items") }}
          </template>
          <template #content>
            <Tag :value="t('problems.inProgress')" severity="info" />
          </template>
        </Card>

        <Card class="shadow-sm">
          <template #title>{{ t("problems.resolved") }}</template>
          <template #subtitle>
            {{ resolvedCount }} {{ t("problems.items") }}
          </template>
          <template #content>
            <Tag :value="t('problems.resolved')" severity="success" />
          </template>
        </Card>
      </div>
    </section>

    <!-- OUT REQUESTS -->
    <section>
      <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">
        {{ t("outRequest.section_title") }}
      </h3>

      <Card
        class="shadow-sm cursor-pointer hover:shadow-md transition"
        @click="goToPendingOutRequests"
      >
        <template #title>{{ t("outRequest.admin_title") }}</template>
        <template #subtitle>
          {{ pendingOutCount }} {{ t("outRequest.pending_approval") }}
        </template>
        <template #content>
          <Tag :value="t('outRequest.pending')" severity="warning" />
        </template>
      </Card>
    </section>

    <!-- RECENT ACTIVE PROBLEMS -->
    <section>
      <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">
        {{ t("problems.recent") }}
      </h3>

      <div v-if="recentProblems.length" class="space-y-2">
        <div
          v-for="p in recentProblems"
          :key="p.PID"
          class="flex items-center justify-between px-4 py-3
                 bg-white rounded-md shadow-sm
                 hover:shadow cursor-pointer transition"
          @click="goToStorage(p.AID)"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">
              {{ p.Description }}
            </p>
            <p class="text-xs text-gray-500">
              {{ p.Boat?.name }} · #{{ p.PID }}
            </p>
          </div>

          <Tag
            :value="t(`problems.status_${p.Status}`)"
            :severity="getStatusColor(p.Status)"
          />
        </div>
      </div>

      <p v-else class="text-sm text-gray-500">
        {{ t("problems.empty") }}
      </p>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

import { getProblems } from "../../services/problemService"
import { getAllOutRequests } from "../../services/outRequestService"

const router = useRouter()
const { t } = useI18n({ useScope: "global" })

const problems = ref([])
const loading = ref(false)
const pendingOutCount = ref(0)

onMounted(async () => {
  loading.value = true
  try {
    problems.value = await getProblems()
    const out = await getAllOutRequests()
    pendingOutCount.value = out.filter(r => r.status === "Pending").length
  } finally {
    loading.value = false
  }
})

const newCount = computed(() =>
  problems.value.filter(p => p.Status === "New").length
)
const inProgressCount = computed(() =>
  problems.value.filter(p => p.Status === "InProgress").length
)
const resolvedCount = computed(() =>
  problems.value.filter(p => p.Status === "Resolved").length
)

const recentProblems = computed(() =>
  problems.value
    .filter(p => p.Status !== "Resolved")
    .sort((a, b) => b.PID - a.PID)
    .slice(0, 5)
)

function goToStorage(aid) {
  if (aid) router.push(`/home/storage/${aid}`)
}

function goToPendingOutRequests() {
  router.push("/home/out-requests?status=Pending")
}

function getStatusColor(status) {
  return {
    New: "warning",
    InProgress: "info",
    Resolved: "success"
  }[status] || null
}
</script>
