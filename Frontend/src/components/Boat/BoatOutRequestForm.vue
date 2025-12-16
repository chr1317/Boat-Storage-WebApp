<template>
  <div class="mt-6 border-t pt-4">
    <h3 class="text-lg font-semibold mb-1">
      {{ t("outRequest.title") }}
    </h3>

    <p class="text-sm text-gray-500 mb-4 max-w-2xl">
      {{ t("outRequest.description") }}
    </p>

    <div v-if="hasAccepted || hasPending" class="mb-4">
  <hr class="mb-3" />

  <p class="text-sm text-gray-600">
    <strong>
      {{ t("outRequest.blocked_title") }}
    </strong>
    <br />
    <span v-if="hasAccepted">
      {{ t("outRequest.blocked_accepted") }}
    </span>
    <span v-else>
      {{ t("outRequest.blocked_pending") }}
    </span>
  </p>
</div>


    <!-- FORM -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- TYPE -->
      <div>
        <label class="block text-sm font-semibold mb-1">
          {{ t("outRequest.type") }}
        </label>
        <Dropdown
          v-model="form.type"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          @change="form.week = null"
        />
      </div>

      <!-- WEEK -->
      <div>
        <label class="block text-sm font-semibold mb-1">
          {{ t("outRequest.week") }}
        </label>

        <Dropdown
          v-model="form.week"
          :options="weekOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          :disabled="weekOptions.length === 0"
        />

        <p class="text-xs text-gray-500 mt-1">
          Select a preferred week (7 days).
        </p>
      </div>

      <!-- COMMENT -->
      <div class="md:col-span-2">
        <label class="block text-sm font-semibold mb-1">
          {{ t("outRequest.comment") }}
        </label>
        <Textarea
          v-model="form.comment"
          autoResize
          rows="2"
          class="w-full"
        />
      </div>

      <!-- SUBMIT -->
      <div class="md:col-span-2 flex justify-end">
        <Button
          :label="t('outRequest.send')"
          icon="pi pi-send"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </div>

    <!-- MY REQUESTS -->
    <div v-if="requests.length" class="mt-6">
      <h4 class="text-md font-semibold mb-2">
        {{ t("outRequest.my_requests") }}
      </h4>

      <DataTable :value="requests" size="small">
        <Column field="type" :header="t('outRequest.type')">
          <template #body="{ data }">
            <Tag :value="data.type" />
          </template>
        </Column>

        <Column field="status" :header="t('outRequest.status')">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="statusColor(data.status)" />
          </template>
        </Column>

        <Column :header="t('outRequest.week')">
          <template #body="{ data }">
            {{ toDDMMYYYY(data.preferredWeekStart) }}
            –
            {{ toDDMMYYYY(data.preferredWeekEnd) }}
          </template>
        </Column>

        <Column field="confirmedDate" :header="t('outRequest.confirmedDate')">
          <template #body="{ data }">
            {{ data.confirmedDate ? toDDMMYYYY(data.confirmedDate) : "—" }}
          </template>
        </Column>

        <Column :header="t('outRequest.actions')" style="width: 140px">
          <template #body="{ data }">
            <Button
              v-if="data.status === 'Pending'"
              label="Cancel"
              size="small"
              text
              severity="danger"
              @click="cancel(data.RQID)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../../stores/auth";

import {
  createOutRequest,
  getMyOutRequests,
  cancelOutRequest,
} from "../../services/outRequestService";

const props = defineProps({
  AID: { type: Number, required: true },
  season: { type: Object, required: true },
});

const toast = useToast();
const { t } = useI18n({ useScope: "global" });
const auth = useAuthStore();

const isClient = computed(() => auth.user?.Role === "Client");

const form = ref({
  type: "Launch",
  week: null,
  comment: "",
});

const requests = ref([]);

const typeOptions = [
  { label: "Launch (water)", value: "Launch" },
  { label: "Trailer pickup", value: "Trailer" },
];

const hasAccepted = computed(() =>
  requests.value.some(r => r.status === "Accepted")
);

const hasPending = computed(() =>
  requests.value.some(r => r.status === "Pending")
);

const canSubmit = computed(() =>
  isClient.value &&
  !hasAccepted.value &&
  !hasPending.value &&
  !!form.value.week
);

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDDMMYYYY(v) {
  if (!v) return "—";
  const datePart = v.includes("T") ? v.split("T")[0] : v;
  if (datePart.includes("-")) {
    const [yyyy, mm, dd] = datePart.split("-");
    return `${dd}.${mm}.${yyyy}`;
  }
  return datePart;
}

const outYear = computed(() =>
  new Date(props.season.endDate).getFullYear()
);

const rejectedWeeks = computed(() =>
  new Set(
    requests.value
      .filter(r => r.status === "Rejected")
      .map(r => `${r.type}|${r.preferredWeekStart}`)
  )
);

const weekOptions = computed(() => {
  if (!props.season?.startDate || !props.season?.endDate) return [];

  const seasonStart = new Date(props.season.startDate);
  const seasonEnd = new Date(props.season.endDate);
  const targetYear = outYear.value;

  seasonStart.setHours(0,0,0,0);
  seasonEnd.setHours(0,0,0,0);

  const weeks = [];
  let current = new Date(seasonStart);

  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);

  while (current <= seasonEnd) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(start.getDate() + 6);

    if (start.getFullYear() !== targetYear) {
      current.setDate(current.getDate() + 7);
      continue;
    }

    if (end < seasonStart || start > seasonEnd) {
      current.setDate(current.getDate() + 7);
      continue;
    }

    if (form.value.type === "Launch") {
      const month = start.getMonth() + 1;
      if (month < 4 || month > 9) {
        current.setDate(current.getDate() + 7);
        continue;
      }
    }

    const key = `${form.value.type}|${formatLocalDate(start)}`;
    if (rejectedWeeks.value.has(key)) {
      current.setDate(current.getDate() + 7);
      continue;
    }

    weeks.push({
      label: `${formatLocalDate(start)} – ${formatLocalDate(end)}`,
      value: { start, end },
    });

    current.setDate(current.getDate() + 7);
  }

  return weeks;
});

async function loadRequests() {
  if (!isClient.value) return;
  const all = await getMyOutRequests();
  requests.value = all.filter(r => r.AID === props.AID);
}

onMounted(loadRequests);

async function submit() {
  try {
    if (hasAccepted.value) return;
    if (hasPending.value) return;

    const { start, end } = form.value.week;

    await createOutRequest({
      AID: props.AID,
      type: form.value.type,
      preferredWeekStart: formatLocalDate(start),
      preferredWeekEnd: formatLocalDate(end),
      comment: form.value.comment || null,
    });

    toast.add({
      severity: "success",
      summary: t("common.success"),
      detail: t("outRequest.created"),
    });

    form.value.week = null;
    form.value.comment = "";
    await loadRequests();
  } catch (err) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: err?.message || t("outRequest.create_failed"),
    });
  }
}

async function cancel(id) {
  if (!confirm(t("outRequest.confirm_cancel") || "Cancel this request?")) return;
  await cancelOutRequest(id);
  await loadRequests();
}

function statusColor(s) {
  return s === "Pending" ? "warning"
       : s === "Accepted" ? "success"
       : s === "Rejected" ? "danger"
       : "secondary";
}
</script>
