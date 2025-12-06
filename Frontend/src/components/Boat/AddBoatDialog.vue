<template>
  <Dialog
    :visible="localVisible"
    @update:visible="emitVisibility"
    header="Add Boat"
    :modal="true"
    :style="{ width: '700px' }"
  >
    <div class="flex flex-col gap-4">

      <h3 class="font-semibold text-lg">Basic info</h3>

      <div>
        <label>Owner *</label>
        <Dropdown
          v-model="boat.UID"
          :options="users"
          optionLabel="FullName"
          optionValue="UID"
          class="w-full"
          placeholder="Select owner"
          filter
        />
      </div>


      <div class="grid grid-cols-2 gap-4">
        <div>
          <label>Name *</label>
          <InputText v-model="boat.name" class="w-full" />
        </div>

        <div>
          <label>HIN *</label>
          <InputText v-model="boat.HIN" class="w-full" />
        </div>

        <div>
          <label>Type *</label>
          <InputText v-model="boat.Type" class="w-full" />
        </div>

        <div>
          <label>Drive *</label>
          <InputText v-model="boat.Drive" class="w-full" />
        </div>

        <div>
          <label>Boathall (BHID) *</label>
          <InputNumber v-model="boat.BHID" class="w-full" :min="1" />
        </div>
      </div>

      <h3 class="font-semibold text-lg mt-4">Dimensions</h3>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label>Length *</label>
          <InputNumber v-model="dimensions.Length" class="w-full" />
        </div>

        <div>
          <label>Width *</label>
          <InputNumber v-model="dimensions.Width" class="w-full" />
        </div>

        <div>
          <label>Height</label>
          <InputNumber v-model="dimensions.Height" class="w-full" />
        </div>

        <div>
          <label>Deepness</label>
          <InputNumber v-model="dimensions.Deepness" class="w-full" />
        </div>

        <div>
          <label>Weight</label>
          <InputNumber v-model="dimensions.Weight" class="w-full" />
        </div>
      </div>
     <h3 class="font-semibold text-lg mt-4">Engine</h3>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="(value, key) in engine" :key="key">
        <label>{{ key }}</label>
        <InputText v-model="engine[key]" class="w-full" />
      </div>
    </div>


      <div class="flex justify-end gap-2 mt-6">
        <Button label="Cancel" severity="secondary" @click="close" />
        <Button label="Create" @click="submit" />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { createBoat } from "../../services/boatService";
import { getUsers } from "../../services/userService";

const props = defineProps({ visible: Boolean });
const emit = defineEmits(["update:visible", "created"]);

const toast = useToast();
const users = ref([]);

// Proxy v-model
const localVisible = ref(props.visible);
watch(() => props.visible, val => localVisible.value = val);
function emitVisibility(val) { emit("update:visible", val); }
function close() { emit("update:visible", false); }

// FORM FIELDS
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
onMounted(async () => {
  users.value = (await getUsers()).map(u => ({
    ...u,
    FullName: `${u.Name} ${u.Lastname} ${u.Email}`,
  }));
});

// Engine is optional — backend fills empty record
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


async function submit() {
  // minimal validation
  if (!boat.value.name || !boat.value.HIN || !boat.value.Type || !boat.value.Drive || !boat.value.UID) {
    toast.add({ severity: "error", summary: "Missing fields", detail: "Fill required boat fields", life: 2500 });
    return;
  }

  if (!dimensions.value.Length || !dimensions.value.Width) {
    toast.add({ severity: "error", summary: "Missing dimensions", detail: "Length and Width required", life: 2500 });
    return;
  }

  try {
    await createBoat({
      boat: boat.value,
      dimensions: dimensions.value,
      engine: engine.value, // backend allows empty
    });

    toast.add({ severity: "success", summary: "Boat created", life: 1500 });
    emit("created");
    close();

  } catch (e) {
    toast.add({ severity: "error", summary: "Error", detail: e.message, life: 3000 });
  }
}
</script>
