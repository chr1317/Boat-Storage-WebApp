<template>
  <Dialog
    :visible="localVisible"
    @update:visible="emitVisibility"
    :modal="true"
    :style="{ width: '750px' }"
    class="custom-dialog"
    :header="t('boat.addBoat')"
  >
    <div class="flex flex-col gap-4">

      <Stepper :value="activeStep" linear>
        <!-- HEADERS -->
        <StepList>
          <Step value="1">{{ t('boat.basicInfo') }}</Step>
          <Step value="2">{{ t('boat.dimensions') }}</Step>
          <Step value="3">{{ t('boat.engine') }}</Step>
          <Step value="4">{{ t('boat.summary') }}</Step>
        </StepList>

        <!-- PANELS -->
        <StepPanels>
          <!-- STEP 1: BASIC -->
          <StepPanel v-slot="{ activateCallback }" value="1">
            <div class="flex flex-col gap-4 min-h-[320px]">
              <h3 class="font-semibold text-lg">{{ t('boat.basicInfo') }}</h3>

              <div>
                <label class="block mb-1">{{ t('boat.owner') }} *</label>
                <Dropdown
                  v-model="boat.UID"
                  :options="users"
                  optionLabel="FullName"
                  optionValue="UID"
                  class="w-full"
                  filter
                  :placeholder="t('boat.select_owner')"
                  :invalid="submittedStep1 && !boat.UID"
                />
                <small v-if="submittedStep1 && !boat.UID" class="text-red-500">
                  {{ t('validation.required') }}
                </small>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block mb-1">{{ t('boat.name') }} *</label>
                  <InputText
                    v-model="boat.name"
                    class="w-full"
                    :invalid="submittedStep1 && !boat.name"
                  />
                  <small v-if="submittedStep1 && !boat.name" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.hin') }} *</label>
                  <InputText
                    v-model="boat.HIN"
                    class="w-full"
                    :invalid="submittedStep1 && !boat.HIN"
                  />
                  <small v-if="submittedStep1 && !boat.HIN" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.type') }} *</label>
                  <InputText
                    v-model="boat.Type"
                    class="w-full"
                    :invalid="submittedStep1 && !boat.Type"
                  />
                  <small v-if="submittedStep1 && !boat.Type" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.drive') }} *</label>
                  <InputText
                    v-model="boat.Drive"
                    class="w-full"
                    :invalid="submittedStep1 && !boat.Drive"
                  />
                  <small v-if="submittedStep1 && !boat.Drive" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>
              </div>
            </div>

            <div class="flex pt-6 justify-end">
              <Button
                :label="t('common.next')"
                icon="pi pi-arrow-right"
                iconPos="right"
                @click="goStep2(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- STEP 2: DIMENSIONS -->
          <StepPanel v-slot="{ activateCallback }" value="2">
            <div class="flex flex-col gap-4 min-h-[320px]">
              <h3 class="font-semibold text-lg">{{ t('boat.dimensions') }}</h3>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block mb-1">{{ t('boat.length') }} *</label>
                  <InputNumber
                    v-model="dimensions.Length"
                    class="w-full"
                    :invalid="submittedStep2 && !dimensions.Length"
                  />
                  <small v-if="submittedStep2 && !dimensions.Length" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.width') }} *</label>
                  <InputNumber
                    v-model="dimensions.Width"
                    class="w-full"
                    :invalid="submittedStep2 && !dimensions.Width"
                  />
                  <small v-if="submittedStep2 && !dimensions.Width" class="text-red-500">
                    {{ t('validation.required') }}
                  </small>
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.height') }}</label>
                  <InputNumber v-model="dimensions.Height" class="w-full" />
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.deepness') }}</label>
                  <InputNumber v-model="dimensions.Deepness" class="w-full" />
                </div>

                <div>
                  <label class="block mb-1">{{ t('boat.weight') }}</label>
                  <InputNumber v-model="dimensions.Weight" class="w-full" />
                </div>
              </div>
            </div>

            <div class="flex pt-6 justify-between">
              <Button
                :label="t('common.back')"
                severity="secondary"
                icon="pi pi-arrow-left"
                @click="activateCallback('1'); activeStep = '1'"
              />
              <Button
                :label="t('common.next')"
                icon="pi pi-arrow-right"
                iconPos="right"
                @click="goStep3(activateCallback)"
              />
            </div>
          </StepPanel>

          <!-- STEP 3: ENGINE -->
          <StepPanel v-slot="{ activateCallback }" value="3">
            <div class="flex flex-col gap-4 min-h-[320px]">
              <h3 class="font-semibold text-lg">{{ t('boat.engine') }}</h3>

              <div class="grid grid-cols-2 gap-4">
                <div v-for="(value, key) in engine" :key="key">
                  <label class="block mb-1">{{ t(`boat.engine_${key}`) }}</label>
                  <InputText v-model="engine[key]" class="w-full" />
                </div>
              </div>

              <div class="mt-2 flex items-center gap-2">
                <Checkbox v-model="createStorage" binary />
                <label>{{ t('boat.createStorageNow') }}</label>
              </div>
            </div>

            <div class="flex pt-6 justify-between">
              <Button
                :label="t('common.back')"
                severity="secondary"
                icon="pi pi-arrow-left"
                @click="activateCallback('2'); activeStep = '2'"
              />
              <Button
                :label="t('common.next')"
                icon="pi pi-arrow-right"
                iconPos="right"
                @click="activateCallback('4'); activeStep = '4'"
              />
            </div>
          </StepPanel>

          <!-- STEP 4: SUMMARY -->
          <StepPanel v-slot="{ activateCallback }" value="4">
            <div class="flex flex-col gap-4 min-h-[320px]">
              <h3 class="font-semibold text-lg">{{ t('boat.summary') }}</h3>

              <p class="text-sm text-gray-600">{{ t('boat.review_before_submit') }}</p>

              <ul class="list-disc ml-6 text-sm text-gray-700">
                <li>{{ t('boat.name') }}: {{ boat.name }}</li>
                <li>{{ t('boat.owner') }}: {{ selectedOwnerName }}</li>
                <li>{{ t('boat.length') }}: {{ dimensions.Length }}</li>
                <li>{{ t('boat.width') }}: {{ dimensions.Width }}</li>
                <li v-if="createStorage">{{ t('boat.storage_will_be_created') }}</li>
              </ul>
            </div>

            <div class="flex pt-6 justify-between">
              <Button
                :label="t('common.back')"
                severity="secondary"
                icon="pi pi-arrow-left"
                @click="activateCallback('3'); activeStep = '3'"
              />
              <Button
                :label="t('common.create')"
                icon="pi pi-check"
                @click="submit"
              />
            </div>
          </StepPanel>
        </StepPanels>
      </Stepper>

    </div>
  </Dialog>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";

import { getUsers } from "../../services/userService";
import { createBoat } from "../../services/boatService";
import { getSeasons } from "../../services/seasonService";
import { createBoatStorage } from "../../services/boatStorageService";

/**
 * PrimeVue v4 Stepper API components
 * (jeśli masz global registration, importy nie są potrzebne,
 * ale lokalnie to jest 100% pewne)
 */
import Stepper from "primevue/stepper";
import StepList from "primevue/steplist";
import Step from "primevue/step";
import StepPanels from "primevue/steppanels";
import StepPanel from "primevue/steppanel";

const props = defineProps({ visible: Boolean });
const emit = defineEmits(["update:visible", "created"]);

const { t } = useI18n({ useScope: "global" });
const toast = useToast();

const localVisible = ref(props.visible);
watch(() => props.visible, v => (localVisible.value = v));
function emitVisibility(v) { emit("update:visible", v); }

const activeStep = ref("1");

const users = ref([]);

const boat = ref({
  name: "",
  HIN: "",
  Type: "",
  Drive: "",
  UID: null,
  BHID: null,
});

const dimensions = ref({
  Length: null,
  Width: null,
  Height: null,
  Deepness: null,
  Weight: null,
});

const engine = ref({
  Model: "",
  Brand: "",
  Engine_nr: "",
  Reversing_gear: "",
  Reversing_gear_nr: "",
  Sterndrive: "",
  Sterndrive_nr: "",
  Transom: "",
  Transom_nr: "",
  BT: "",
  ST: "",
  Moto_H: ""
});

const createStorage = ref(false);

/* validation flags */
const submittedStep1 = ref(false);
const submittedStep2 = ref(false);

const selectedOwnerName = computed(() => {
  const u = users.value.find(u => u.UID === boat.value.UID);
  return u ? u.FullName : "-";
});

onMounted(async () => {
  const all = await getUsers();
  users.value = all.map(u => ({
    ...u,
    FullName: `${u.Name} ${u.Lastname} (${u.Email})`,
  }));
});

function goStep2(activateCallback) {
  submittedStep1.value = true;

  if (!boat.value.UID || !boat.value.name || !boat.value.HIN || !boat.value.Type || !boat.value.Drive) {
    toast.add({ severity: "warn", summary: t("validation.fill_required"), life: 2000 });
    return;
  }

  activateCallback("2");
  activeStep.value = "2";
}

function goStep3(activateCallback) {
  submittedStep2.value = true;

  if (!dimensions.value.Length || !dimensions.value.Width) {
    toast.add({ severity: "warn", summary: t("validation.fill_required"), life: 2000 });
    return;
  }

  activateCallback("3");
  activeStep.value = "3";
}

async function fetchCurrentSeason() {
  const seasons = await getSeasons();
  if (!Array.isArray(seasons) || seasons.length === 0) throw new Error("No seasons defined");

  // najnowszy po seasonID
  return [...seasons].sort((a, b) => b.seasonID - a.seasonID)[0];
}

async function submit() {
  try {
    const newBoat = await createBoat({
      boat: boat.value,
      dimensions: dimensions.value,
      engine: engine.value,
    });

    if (createStorage.value) {
      const season = await fetchCurrentSeason();
      await createBoatStorage({
        BID: newBoat.BID,
        seasonID: season.seasonID,
        ArrivalDate: new Date().toISOString().slice(0, 10),
      });
    }

    toast.add({ severity: "success", summary: t("boat.created"), life: 1500 });
    emit("created");
    emit("update:visible", false);

    // reset
    activeStep.value = "1";
    submittedStep1.value = false;
    submittedStep2.value = false;

  } catch (err) {
    toast.add({
      severity: "error",
      summary: t("common.error"),
      detail: err?.message || t("boat.create_failed"),
      life: 3000,
    });
  }
}
</script>

<style>
.custom-dialog .p-dialog-content {
  padding: 1.5rem !important;
}
.custom-dialog .p-dialog-header {
  padding: 1.2rem 1.5rem !important;
}
</style>
