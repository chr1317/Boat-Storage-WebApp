<template>
  <div class="mt-6 border-t pt-4">
    <h3 class="text-lg font-semibold mb-2">
      {{ t("outRequest.title") }}
    </h3>

    <p class="text-sm text-gray-500 mb-3">
      {{ t("outRequest.help") }}
    </p>

    <!-- FORM -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">

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
          placeholder="Select type"
          @change="form.week = null"
        />
      </div>

      <!-- WEEK SELECTOR -->
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
          placeholder="Select week"
          :disabled="weekOptions.length === 0"
        />

        <small class="text-xs text-gray-500">
          {{ t("outRequest.week_hint") }}
        </small>
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
    </div>

    <!-- SUBMIT -->
    <div class="flex justify-end mt-4">
      <Button
        :label="t('outRequest.send')"
        icon="pi pi-send"
        @click="submit"
      />
    </div>

    <!-- CLIENT REQUESTS -->
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
        <Column field="rejectReason" :header="t('outRequest.reason')">
            <template #body="{ data }">
                {{ data.rejectReason ? data.rejectReason : "—" }}
            </template>
        </Column>

        <Column :header="t('outRequest.week')">
          <template #body="{ data }">
            {{ data.preferredWeekStart }} – {{ data.preferredWeekEnd }}
          </template>
        </Column>

        <Column field="confirmedDate" :header="t('outRequest.confirmedDate')">
          <template #body="{ data }">
            {{ data.confirmedDate ? new Date(data.confirmedDate).toLocaleDateString() : "—" }}
          </template>
        </Column>

        <Column :header="t('outRequest.actions')" style="width: 120px">
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
  boat: { type: Object, required: true },
});

const rejectedWeeks = computed(() =>
  requests.value
    .filter(r => r.status === "Rejected")
    .map(r => ({
      start: new Date(r.preferredWeekStart),
      end: new Date(r.preferredWeekEnd),
    }))
);

const toast = useToast();
const { t } = useI18n({ useScope: "global" });
const auth = useAuthStore();

const form = ref({
  type: "Launch",
  week: null, // { start, end }
  comment: "",
});

const requests = ref([]);

const START_MONTH = 4; // April
const END_MONTH = 9;   // September

const MIN_DAYS_LAUNCH_WITH_WORKS = 21;
const MIN_DAYS_LAUNCH_NO_WORKS = 7;
const MIN_DAYS_TRAILER = 3;


const typeOptions = [
  { label: "Launch (water)", value: "Launch" },
  { label: "Trailer pickup", value: "Trailer" },
];

const isClient = computed(() => auth.user?.Role === "Client");

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}
function getWeekStartDate(y, w) {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  ISOweekStart.setHours(0, 0, 0, 0);
  return ISOweekStart;
}

function getWeekOptions() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  const out = [];

  for (const year of years) {
    for (let w = 1; w <= 53; w++) {
      const start = getWeekStartDate(year, w);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (start.getFullYear() !== year) continue;

      out.push({
        label: `Week ${w} (${year}): ${start.toISOString().slice(0,10)} - ${end.toISOString().slice(0,10)}`,
        value: { week: w, start, end, year }
      });
    }
  }

  return out;
}


function weekOverlapsSeason(start, end) {
  const s = start.getMonth() + 1;
  const e = end.getMonth() + 1;

  if (e < START_MONTH) return false;
  if (s > END_MONTH) return false;

  return true;
}

function daysBetween(a, b) {
  const s = new Date(a); s.setHours(0,0,0,0);
  const t = new Date(b); t.setHours(0,0,0,0);
  return Math.floor((t - s) / 86400000);
}

const weekOptions = computed(() => {
  const all = getWeekOptions();
  const today = new Date();

  return all.filter(w => {
    const start = w.value.start;
    const end = w.value.end;

    // 1. Launch → tylko sezon
    if (form.value.type === "Launch" && !weekOverlapsSeason(start, end))
      return false;

    // 2. minimalny lead time
    let minDays = MIN_DAYS_TRAILER;
    if (form.value.type === "Launch") minDays = MIN_DAYS_LAUNCH_NO_WORKS;

    if (daysBetween(today, start) < minDays)
      return false;

    // 3. BLOKADA ODRZUCONYCH TYGODNI
    if (rejectedWeeks.value.some(r =>
      r.start.getTime() === start.getTime() &&
      r.end.getTime() === end.getTime()
    )) {
      return false;
    }

    return true;
  });
});

async function loadRequests() {
  if (!isClient.value) return;
  const all = await getMyOutRequests();
  requests.value = all.filter(r => r.BID === props.boat.BID);
}
onMounted(loadRequests);

function statusColor(s) {
  switch (s) {
    case "Pending": return "warning";
    case "Accepted": return "success";
    case "Rejected": return "danger";
    case "Cancelled": return "secondary";
    default: return null;
  }
}

async function submit() {
  if (!isClient.value) {
    toast.add({ severity: "error", summary: t("common.error"), detail: t("outRequest.only_client") });
    return;
  }

  if (!form.value.week) {
    toast.add({ severity: "error", summary: t("common.error"), detail: t("outRequest.week_required") });
    return;
  }

  const { start, end } = form.value.week;

  try {
    await createOutRequest({
      BID: props.boat.BID,
      type: form.value.type,
      preferredWeekStart: start.toISOString().slice(0,10),
      preferredWeekEnd: end.toISOString().slice(0,10),
      comment: form.value.comment || null,
    });

    toast.add({ severity: "success", summary: t("common.success"), detail: t("outRequest.created") });

    form.value.comment = "";
    form.value.week = null;
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
  if (!confirm(t("outRequest.confirm_cancel"))) return;

  try {
    await cancelOutRequest(id);
    await loadRequests();
  } catch {
    toast.add({ severity: "error", summary: t("common.error"), detail: t("outRequest.cancel_failed") });
  }
}
</script>
