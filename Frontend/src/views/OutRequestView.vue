<template>
  <div class="p-6 space-y-6">
    <h2 class="text-2xl font-semibold">
      {{ t("outRequest.admin_title") }}
    </h2>

    <!-- Filter -->
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-600">{{ t("outRequest.filter_status") }}</span>
      <Dropdown
        v-model="filterStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        class="w-52"
        showClear
        :placeholder="t('outRequest.all_statuses')"
        @change="load"
      />
    </div>

    <!-- Table -->
    <DataTable
      :value="requests"
      :loading="loading"
      dataKey="RQID"
      class="p-datatable-sm"
      :paginator="true"
      :rows="10"
    >
      <Column field="RQID" header="ID" style="width:80px" />

      <Column :header="t('outRequest.boat')">
        <template #body="{ data }">
          <Button link class="p-0" @click="goToBoat(data.BID)">
            {{ data.Boat?.name || "—" }}
          </Button>
          <div class="text-xs text-gray-500">
            {{ data.Boat?.Type }} – HIN: {{ data.Boat?.HIN }}
          </div>
        </template>
      </Column>

      <Column :header="t('outRequest.type')">
        <template #body="{ data }">
          <Tag :value="data.type" />
        </template>
      </Column>

      <Column :header="t('outRequest.week')">
        <template #body="{ data }">
          {{ data.preferredWeekStart }} – {{ data.preferredWeekEnd }}
        </template>
      </Column>

      <Column :header="t('outRequest.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusColor(data.status)" />
        </template>
      </Column>

      <Column :header="t('outRequest.confirmedDate')">
        <template #body="{ data }">
          {{ data.confirmedDate ? new Date(data.confirmedDate).toLocaleDateString() : "—" }}
        </template>
      </Column>

      <Column :header="t('outRequest.requester')">
        <template #body="{ data }">
          {{ data.Requester?.Name || "—" }}
        </template>
      </Column>

      <Column :header="t('outRequest.actions')" style="width:180px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              v-if="data.status === 'Pending'"
              label="Review"
              size="small"
              icon="pi pi-eye"
              @click="openDialog(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Review dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="t('outRequest.review_title')"
      :style="{ width: '500px' }"
    >
      <div v-if="selected">
        <p class="mb-2">
          <strong>{{ t("outRequest.boat") }}:</strong>
          {{ selected.Boat?.name }} (HIN: {{ selected.Boat?.HIN }})
        </p>
        <p class="mb-2">
          <strong>{{ t("outRequest.type") }}:</strong> {{ selected.type }}
        </p>
        <p class="mb-2">
          <strong>{{ t("outRequest.week") }}:</strong>
          {{ selected.preferredWeekStart }} – {{ selected.preferredWeekEnd }}
        </p>
        <p class="mb-2">
          <strong>{{ t("outRequest.comment") }}:</strong>
          {{ selected.comment || "—" }}
        </p>

        <div class="mt-4 space-y-3">
          <div>
            <label class="block text-sm font-semibold mb-1">
              {{ t("outRequest.confirmedDate") }}
            </label>
            <Calendar
              v-model="confirmedDate"
              dateFormat="yy-mm-dd"
              class="w-full"
              :minDate="new Date(selected.preferredWeekStart)"
              :maxDate="new Date(selected.preferredWeekEnd)"
            />
            <small class="text-xs text-gray-500">
              {{ t("outRequest.confirmed_hint") }}
            </small>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-1">
              {{ t("outRequest.reject_reason") }}
            </label>
            <Textarea
              v-model="rejectReason"
              autoResize
              rows="2"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <Button
            label="Reject"
            severity="danger"
            outlined
            @click="doReject"
          />
          <div class="flex gap-2">
            <Button
              label="Close"
              text
              @click="dialogVisible = false"
            />
            <Button
              label="Approve"
              icon="pi pi-check"
              @click="doApprove"
            />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";

import {
  getAllOutRequests,
  approveOutRequest,
  rejectOutRequest,
} from "../services/outRequestService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();
const router = useRouter();

const requests = ref([]);
const loading = ref(true);
const filterStatus = ref(null);

const dialogVisible = ref(false);
const selected = ref(null);
const confirmedDate = ref(null);
const rejectReason = ref("");

const statusOptions = [
  { label: "Pending", value: "Pending" },
  { label: "Accepted", value: "Accepted" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

function statusColor(status) {
  switch (status) {
    case "Pending": return "warning";
    case "Accepted": return "success";
    case "Rejected": return "danger";
    case "Cancelled": return "secondary";
    default: return null;
  }
}

async function load() {
  loading.value = true;
  try {
    requests.value = await getAllOutRequests(filterStatus.value || undefined);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function goToBoat(BID) {
  router.push(`/home/boats/${BID}`);
}

function openDialog(row) {
  selected.value = row;
  confirmedDate.value = row.confirmedDate ? new Date(row.confirmedDate) : null;
  rejectReason.value = row.rejectReason || "";
  dialogVisible.value = true;
}

async function doApprove() {
  if (!confirmedDate.value) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: t("outRequest.confirm_required"),
      life: 2500,
    });
    return;
  }

  try {
    await approveOutRequest(
      selected.value.RQID,
      confirmedDate.value.toISOString()
    );
    toast.add({
      severity: "success",
      summary: t("common.success"),
      detail: t("outRequest.approved"),
      life: 2500,
    });
    dialogVisible.value = false;
    await load();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: e?.message || t("outRequest.approve_failed"),
      life: 3000,
    });
  }
}

async function doReject() {
  try {
    await rejectOutRequest(selected.value.RQID, rejectReason.value || null);
    toast.add({
      severity: "success",
      summary: t("common.success"),
      detail: t("outRequest.rejected"),
      life: 2500,
    });
    dialogVisible.value = false;
    await load();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: e?.message || t("outRequest.reject_failed"),
      life: 3000,
    });
  }
}
</script>
