<template>
 <Dialog
  :visible="visible"
  modal
  :header="t('boat.addWork')"
  :style="{ width: '900px' }"
  @update:visible="(val) => emit('update:visible', val)"
>
    <!-- 🔹 Loading -->
    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <!-- 🔹 Główna zawartość -->
    <div v-else class="grid grid-cols-2 gap-4">
      <!-- PickList -->
      <div>
        <h4 class="font-semibold mb-2">{{ t('boat.available_services') }}</h4>
        <PickList
          :key="availableServices.length"
          :source="availableServices"
          :target="selectedServices"
          dataKey="SID"
          listStyle="height: 400px"
        >
          <template #sourceHeader>{{ t('boat.available') }}</template>
          <template #targetHeader>{{ t('boat.selected') }}</template>

          <template #option="{ option }">
            <div class="flex justify-between w-full">
              <span>{{ option.Name }}</span>
              <small class="text-gray-500">{{ option.Part }}</small>
            </div>
          </template>
        </PickList>
      </div>

      <!-- Tree -->
      <div>
        <h4 class="font-semibold mb-2">{{ t('boat.structure') }}</h4>
        <Tree
          :value="treeData"
          v-model:selectionKeys="selectedKeys"
          selectionMode="single"
          class="border rounded-md p-2"
        >
          <template #default="{ node }">
            <div class="flex justify-between items-center w-full">
              <span>{{ node.label }}</span>
              <div class="flex gap-2">
                <Button
                  icon="pi pi-plus"
                  size="small"
                  text
                  @click.stop="addSubtask(node.key)"
                  v-tooltip.bottom="t('boat.add_subtask')"
                />
                <Button
                  icon="pi pi-trash"
                  size="small"
                  text
                  severity="danger"
                  @click.stop="removeNode(node.key)"
                  v-tooltip.bottom="t('boat.remove')"
                />
              </div>
            </div>
          </template>
        </Tree>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="emit('update:visible', false)" />
      <Button label="Save" @click="save" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import PickList from "primevue/picklist";
import Tree from "primevue/tree";
import Button from "primevue/button";
import ProgressSpinner from "primevue/progressspinner";

import { getServices } from "../../services/serviceService";
import { createWork } from "../../services/workService";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const props = defineProps({
  visible: Boolean,
  boatId: { type: Number, required: true },
  seasonId: { type: Number, required: true },
  userId: { type: Number, required: true },
});

const emit = defineEmits(["close", "created", "update:visible"]);

const loading = ref(false);
const availableServices = ref([]);
const selectedServices = ref([]);
const treeData = ref([]);
const selectedKeys = ref({});

onMounted(loadServices);

function loadServices() {
  loading.value = true;
  getServices()
    .then((res) => {
      availableServices.value = Array.isArray(res) ? res : [];
    })
    .catch(() => {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: t("boat.load_services_error"),
        life: 3000,
      });
    })
    .finally(() => {
      loading.value = false;
    });
}

watch(selectedServices, (selected) => {
  treeData.value = selected.map((s) => ({
    key: s.SID,
    label: `${s.Name} (${s.Part})`,
    data: { SID: s.SID },
    children: [],
  }));
});

function addSubtask(parentKey) {
  const parent = findNode(treeData.value, parentKey);
  if (!parent) return;
  const newKey = crypto.randomUUID();
  parent.children.push({
    key: newKey,
    label: "New subtask",
    data: { SID: parent.data.SID, isSub: true },
  });
}

function removeNode(key) {
  treeData.value = removeRecursive(treeData.value, key);
}

function removeRecursive(nodes, key) {
  return nodes.filter((n) => {
    if (n.key === key) return false;
    if (n.children) n.children = removeRecursive(n.children, key);
    return true;
  });
}

function findNode(nodes, key) {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findNode(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

async function save() {
  try {
    loading.value = true;
    for (const node of treeData.value) {
      const main = await createWork({
        SID: node.data.SID,
        BID: props.boatId,
        seasonID: props.seasonId,
        UID: props.userId,
        Date: new Date(),
        Comment: "Created via frontend",
        State: "ToDo",
      });

      if (node.children?.length) {
        for (const sub of node.children) {
          await createWork({
            SID: sub.data.SID,
            BID: props.boatId,
            seasonID: props.seasonId,
            parentWID: main.WID,
            Comment: "Subtask",
            State: "ToDo",
          });
        }
      }
    }

    toast.add({
      severity: "success",
      summary: t("boat.work_created"),
      life: 2000,
    });
    emit("created");
    emit("update:visible", false);
  } catch (err) {
    console.error(err);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: t("boat.create_error"),
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}
</script>
