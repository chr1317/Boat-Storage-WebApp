<template>
  <Dialog
    :visible="localVisible"
    @update:visible="emitVisibility"
    modal
    class="custom-dialog"
    :header="`${t('common.edit')} ${t('boat.boat')}`"
    :style="{ width: '750px' }"
    :breakpoints="{
      '1200px': '75vw',
      '768px': '95vw'
    }"
  >
    <TabView>

      <!-- BASIC INFO -->
      <TabPanel :header="t('boat.basicInfo')">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label class="block mb-1">{{ t('boat.type') }}</label>
            <InputText v-model="boatForm.Type" class="w-full" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.drive') }}</label>
            <InputText v-model="boatForm.Drive" class="w-full" />
          </div>
        </div>
      </TabPanel>

      <!-- DIMENSIONS -->
      <TabPanel :header="t('boat.dimensions')">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label class="block mb-1">{{ t('boat.length') }}</label>
            <InputNumber v-model="dimensions.Length" class="w-full" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.width') }}</label>
            <InputNumber v-model="dimensions.Width" class="w-full" />
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

          <div>
            <label class="block mb-1">Weight (without engine)</label>
            <InputNumber v-model="dimensions.Weight_we" class="w-full" />
          </div>

          <div>
            <label class="block mb-1">Underwater color</label>
            <InputText v-model="dimensions.U_Color" class="w-full" />
          </div>

          <div>
            <label class="block mb-1">Topside color</label>
            <InputText v-model="dimensions.T_Color" class="w-full" />
          </div>
        </div>
      </TabPanel>

      <!-- ENGINE -->
      <TabPanel :header="t('boat.engine')">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label class="block mb-1">{{ t('boat.engine_Brand') }}</label>
            <InputText v-model="engine.Brand" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Model') }}</label>
            <InputText v-model="engine.Model" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Engine_nr') }}</label>
            <InputText v-model="engine.Engine_nr" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Moto_H') }}</label>
            <InputNumber v-model="engine.Moto_H" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Reversing_gear') }}</label>
            <InputText v-model="engine.Reversing_gear" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Reversing_gear_nr') }}</label>
            <InputText v-model="engine.Reversing_gear_nr" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Sterndrive') }}</label>
            <InputText v-model="engine.Sterndrive" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Sterndrive_nr') }}</label>
            <InputText v-model="engine.Sterndrive_nr" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Transom') }}</label>
            <InputText v-model="engine.Transom" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_Transom_nr') }}</label>
            <InputText v-model="engine.Transom_nr" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_BT') }}</label>
            <InputText v-model="engine.BT" />
          </div>

          <div>
            <label class="block mb-1">{{ t('boat.engine_ST') }}</label>
            <InputText v-model="engine.ST" />
          </div>
        </div>
      </TabPanel>

    </TabView>

    <!-- FOOTER -->
    <template #footer>
      <Button
        :label="t('common.cancel')"
        outlined
        @click="emitVisibility(false)"
      />
      <Button
        :label="t('common.save')"
        icon="pi pi-check"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { updateBoat } from "../../services/boatService";
import {
  updateDimensions,
  createDimensions
} from "../../services/dimensionsService";
import {
  updateEngine,
  createEngine
} from "../../services/engineService";

const { t } = useI18n({ useScope: "global" });
const originalBoat = ref(null);
const originalDimensions = ref(null);
const originalEngine = ref(null);


const props = defineProps({
  visible: Boolean,
  boat: Object
});

const emit = defineEmits(["update:visible", "updated"]);

const localVisible = ref(props.visible);
watch(() => props.visible, v => (localVisible.value = v));

function emitVisibility(v) {
  emit("update:visible", v);
}

const boatForm = ref({ Type: "", Drive: "" });

const dimensions = ref({
  Length: null,
  Width: null,
  Height: null,
  Deepness: null,
  Weight: null,
  Weight_we: null,
  U_Color: "",
  T_Color: "",
});

const engine = ref({
  Brand: "",
  Model: "",
  Engine_nr: "",
  Reversing_gear: "",
  Reversing_gear_nr: "",
  Sterndrive: "",
  Sterndrive_nr: "",
  Transom: "",
  Transom_nr: "",
  BT: "",
  ST: "",
  Moto_H: null,
});

watch(
  () => props.boat,
  (b) => {
    if (!b) return;

    boatForm.value = {
      Type: b.Type ?? "",
      Drive: b.Drive ?? "",
    };

    dimensions.value = {
      Length: b.BoatDimension?.Length ?? null,
      Width: b.BoatDimension?.Width ?? null,
      Height: b.BoatDimension?.Height ?? null,
      Deepness: b.BoatDimension?.Deepness ?? null,
      Weight: b.BoatDimension?.Weight ?? null,
      Weight_we: b.BoatDimension?.Weight_we ?? null,
      U_Color: b.BoatDimension?.U_Color ?? "",
      T_Color: b.BoatDimension?.T_Color ?? "",
    };

    engine.value = {
      Brand: b.EngineInformation?.Brand ?? "",
      Model: b.EngineInformation?.Model ?? "",
      Engine_nr: b.EngineInformation?.Engine_nr ?? "",
      Reversing_gear: b.EngineInformation?.Reversing_gear ?? "",
      Reversing_gear_nr: b.EngineInformation?.Reversing_gear_nr ?? "",
      Sterndrive: b.EngineInformation?.Sterndrive ?? "",
      Sterndrive_nr: b.EngineInformation?.Sterndrive_nr ?? "",
      Transom: b.EngineInformation?.Transom ?? "",
      Transom_nr: b.EngineInformation?.Transom_nr ?? "",
      BT: b.EngineInformation?.BT ?? "",
      ST: b.EngineInformation?.ST ?? "",
      Moto_H: b.EngineInformation?.Moto_H ?? null,
    };
    originalBoat.value = JSON.parse(JSON.stringify(boatForm.value));
    originalDimensions.value = JSON.parse(JSON.stringify(dimensions.value));
    originalEngine.value = JSON.parse(JSON.stringify(engine.value));
  },
  { immediate: true }
);

async function submit() {
  const BID = props.boat.BID;

  if (hasChanges(boatForm.value, originalBoat.value)) {
    await updateBoat(BID, boatForm.value);
  }

  const dimensionsChanged = hasChanges(dimensions.value, originalDimensions.value);

  if (dimensionsChanged) {
    if (props.boat.BoatDimension) {
      await updateDimensions(BID, dimensions.value);
    } else if (hasAnyValue(dimensions.value)) {
      await createDimensions({ BID, ...dimensions.value });
    }
  }

  const engineChanged = hasChanges(engine.value, originalEngine.value);

  if (engineChanged) {
    if (props.boat.EngineInformation) {
      await updateEngine(BID, engine.value);
    } else if (hasAnyValue(engine.value)) {
      await createEngine({ BID, ...engine.value });
    }
  }

  emit("updated");
  emit("update:visible", false);
}

function hasChanges(current, original) {
  if (!original) return true;
  return JSON.stringify(current) !== JSON.stringify(original);
}

function hasAnyValue(obj) {
  return Object.values(obj).some(
    v => v !== null && v !== "" && v !== undefined
  );
}

</script>
