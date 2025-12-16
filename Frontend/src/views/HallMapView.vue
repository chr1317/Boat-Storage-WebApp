<template>
  <div class="p-4 h-full flex flex-col gap-4">
    <!-- HEADER -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">
          Hall {{ hall?.Name || hall?.BHID }}
        </h2>
        <p class="text-sm text-gray-500" v-if="hall">
          {{ hall.Length }} × {{ hall.Width }} cm
        </p>
      </div>

      <div class="flex items-center gap-3">
        <span v-if="highlightBoatName" class="text-sm text-gray-600">
          Highlight boat: <strong>{{ highlightBoatName }}</strong>
        </span>

        <div class="flex items-center gap-2">
          <span
            class="text-xs px-2 py-1 rounded-full"
            :class="editMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'"
          >
            {{ editMode ? "EDIT MODE" : "VIEW MODE" }}
          </span>

          <Button
            :icon="editMode ? 'pi pi-check' : 'pi pi-pencil'"
            :label="editMode ? 'Finish editing' : 'Edit layout'"
            :severity="editMode ? 'success' : 'warning'"
            @click="toggleEdit"
          />

          <Button
            icon="pi pi-save"
            label="Save"
            severity="secondary"
            :disabled="dirtyBIDs.size === 0"
            @click="saveDirtyPositions"
          />
        </div>
      </div>
    </div>

    <div class="flex gap-4 flex-1 min-h-0">
      <div class="w-64 border p-3 rounded-xl overflow-auto bg-white">
        <h3 class="font-semibold mb-2">Unassigned boats</h3>

        <div v-if="freeBoats.length === 0" class="text-xs text-gray-500 italic">
          All boats in this hall have positions.
        </div>

        <div
          v-for="boat in freeBoats"
          :key="boat.BID"
          class="p-2 border rounded mb-2 hover:bg-gray-100"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">
                {{ boat.name || ('BID ' + boat.BID) }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                Owner: {{ boat.User?.Name }} {{ boat.User?.Lastname }}
              </div>
              <div v-if="placingBoat?.BID === boat.BID" class="text-[10px] text-orange-600 mt-1">
                Click on the map to place…
              </div>
            </div>

            <Button
              size="small"
              icon="pi pi-plus"
              :label="placingBoat?.BID === boat.BID ? 'Placing...' : 'Place'"
              :severity="placingBoat?.BID === boat.BID ? 'warning' : 'primary'"
              @click="startPlacingBoat(boat)"
            />
          </div>
        </div>
      </div>

      <div class="flex-1 border rounded-xl overflow-hidden relative">
        <div ref="mapEl" class="w-full h-full"></div>

        <div
          v-if="!loading && (!hall || positions.length === 0)"
          class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none"
        >
          No positions for this hall.
        </div>

        <div
          class="absolute bottom-3 left-3 text-xs px-2 py-1 rounded bg-white/80 border text-gray-600"
        >
          <span v-if="placingBoat">
            Placing boat: click on the map. (ESC cancels)
          </span>
          <span v-else-if="editMode">
            Drag boats to move. Changes are saved only after clicking Save / Finish editing.
          </span>
          <span v-else>
            View mode – editing disabled.
          </span>
        </div>
      </div>
    </div>

    <!-- INFO -->
    <div class="flex justify-end">
      <Button
        icon="pi pi-info-circle"
        label="Info"
        severity="secondary"
        @click="saveLayout"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";

import { getBoathall } from "../services/boathallService";
import {
  getHallPositions,
  createBoatPosition,
  updateBoatPosition,
  deleteBoatPosition,
} from "../services/boatPositionService";
import { getBoats, updateBoat } from "../services/boatService";

import Map from "ol/Map";
import View from "ol/View";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import Polygon from "ol/geom/Polygon";
import { Style, Stroke, Fill, Text } from "ol/style";
import Translate from "ol/interaction/Translate";
import "ol/ol.css";

const route = useRoute();
const toast = useToast();

const mapEl = ref(null);
const map = ref(null);

const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({ source: vectorSource });

let translateInteraction = null;

const hall = ref(null);
const positions = ref([]);
const loading = ref(true);
const freeBoats = ref([]);

const editMode = ref(false);

const placingBoat = ref(null);

const dirtyBIDs = ref(new Set());

const highlightBoatId = computed(() => {
  const val = route.query.boat;
  return val ? Number(val) : null;
});

const highlightBoatName = computed(() => {
  const b = positions.value.find((p) => p.BID === highlightBoatId.value);
  return b?.Boat?.name || null;
});

function clampToHall(pos) {
  if (!hall.value) return pos;
  const hallW = Number(hall.value.Width);
  const hallL = Number(hall.value.Length);

  const w = Number(pos.Width);
  const l = Number(pos.Length);

  let x = Number(pos.PosX);
  let y = Number(pos.PosY);

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + w > hallW) x = Math.max(0, hallW - w);
  if (y + l > hallL) y = Math.max(0, hallL - l);

  return { ...pos, PosX: x, PosY: y };
}

async function saveOrUpdatePosition(pos) {
  if (pos.PositionID) {
    await updateBoatPosition(pos.PositionID, {
      PosX: pos.PosX,
      PosY: pos.PosY,
      BHID: hall.value.BHID,
      BID: pos.BID,
    });
    return;
  }

  const created = await createBoatPosition({
    BHID: hall.value.BHID,
    BID: pos.BID,
    PosX: pos.PosX,
    PosY: pos.PosY,
  });

  pos.PositionID = created.PositionID || created.PositionId || created.id;
}

function setCursor(cursor) {
  if (!map.value?.getTargetElement) return;
  const el = map.value.getTargetElement();
  if (!el) return;
  el.style.cursor = cursor;
}

function disableDragging() {
  if (!map.value) return;

  map.value.getInteractions().getArray()
    .filter(i => i instanceof Translate)
    .forEach(i => map.value.removeInteraction(i));

  translateInteraction = null;

  setCursor("default");
}


function enableBoatDragging() {
  if (!map.value) return;

  disableDragging();

  translateInteraction = new Translate({
    layers: [vectorLayer],
    filter: (feature) => feature?.isBoat === true,
    hitTolerance: 6,
  });

  translateInteraction.on("translateend", (e) => {
    if (!editMode.value) return;

    const f = e.features?.item(0);
    if (!f) return;

    const geom = f.getGeometry();
    const coords = geom.getCoordinates()[0];

    const newXraw = coords[0][0];
    const newYmapped = coords[0][1];
    const L = Number(hall.value.Length);

    const p = positions.value.find((pos) => pos.BID === f.BID);
    if (!p) return;

    p.PosX = Number(newXraw);
    p.PosY = Number(L - newYmapped - p.Length);

    const clamped = clampToHall(p);
    p.PosX = clamped.PosX;
    p.PosY = clamped.PosY;

    dirtyBIDs.value.add(p.BID);

    drawHallAndBoats();
  });

  map.value.addInteraction(translateInteraction);
  setCursor("move");
}

async function toggleEdit() {
  if (editMode.value) {
    editMode.value = false;

    disableDragging();

    if (dirtyBIDs.value.size > 0) {
      await saveDirtyPositions();
    }

    drawHallAndBoats();
    return;
  }

  placingBoat.value = null;
  editMode.value = true;

  enableBoatDragging();
}


async function saveDirtyPositions() {
  if (!hall.value) return;

  const hallW = Number(hall.value.Width);
  const hallL = Number(hall.value.Length);

  const toSave = positions.value.filter((p) => dirtyBIDs.value.has(p.BID));
  if (toSave.length === 0) return;

  for (const p of toSave) {
    const x = Number(p.PosX);
    const y = Number(p.PosY);
    const w = Number(p.Width);
    const l = Number(p.Length);

    if (
      Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(l) ||
      x < 0 || y < 0 ||
      x + w > hallW ||
      y + l > hallL
    ) {
      toast.add({
        severity: "warn",
        summary: "Invalid position",
        detail: "Boat must be fully inside the hall before saving.",
        life: 2500,
      });
      return;
    }
  }

  try {
    for (const p of toSave) {
      await saveOrUpdatePosition(p);
    }

    dirtyBIDs.value.clear();

    toast.add({
      severity: "success",
      summary: "Saved",
      detail: `Saved ${toSave.length} position(s).`,
      life: 1200,
    });

    await loadData();
  } catch (err) {
    console.error(err);

    toast.add({
      severity: "error",
      summary: "Save failed",
      detail: err?.message || "Backend rejected at least one position.",
      life: 3000,
    });

    dirtyBIDs.value.clear();
    await loadData();
  }
}

function startPlacingBoat(boat) {
    editMode.value = false;
    disableDragging();
  

  placingBoat.value = boat;
  setCursor("crosshair");

  toast.add({
    severity: "info",
    summary: "Place mode",
    detail: "Click on the map to place the boat. Press ESC to cancel.",
    life: 2500,
  });
}

function cancelPlacing() {
  placingBoat.value = null;
  setCursor("default");
}

function initMap() {
  if (!mapEl.value) return;

  map.value = new Map({
    target: mapEl.value,
    layers: [vectorLayer],
    interactions: [],
    controls: [],
    view: new View({
      center: [0, 0],
      zoom: 1,
      constrainOnlyCenter: true,
      enableRotation: false,
    }),
  });

  map.value.on("singleclick", async (e) => {
    if (!placingBoat.value) return;
    if (!hall.value) return;

    const boat = placingBoat.value;

    const [x, yMapped] = e.coordinate;
    const hallLength = Number(hall.value.Length);

    const posX = Math.round(x);
    const posY = Math.round(hallLength - yMapped);

    try {
      await updateBoat(boat.BID, { BHID: hall.value.BHID });

      await createBoatPosition({
        BHID: hall.value.BHID,
        BID: boat.BID,
        PosX: posX,
        PosY: posY,
      });

      toast.add({
        severity: "success",
        summary: "Boat placed",
        detail: "Position created.",
        life: 1200,
      });

      cancelPlacing();
      editMode.value = false;
      disableDragging();
      await loadData();
    } catch (err) {
      console.error(err);
      toast.add({
        severity: "error",
        summary: "Cannot place boat",
        detail: err?.message || "Collision or out of bounds.",
        life: 3000,
      });

      try {
        await updateBoat(boat.BID, { BHID: null });
      } catch (_) {}
    }
  });

  window.addEventListener("keydown", onKeyDown);

  map.value.on("contextmenu", async (e) => {
    e.preventDefault();
    if (!map.value) return;

    if (placingBoat.value) return;

    const pixel = map.value.getEventPixel(e.originalEvent);
    const feature = map.value.forEachFeatureAtPixel(pixel, (f) => f);

    if (!feature?.isBoat) return;

    const bid = feature.BID;
    const pos = positions.value.find((p) => p.BID === bid);
    if (!pos) return;

    try {
      if (pos.PositionID) await deleteBoatPosition(pos.PositionID);
      await updateBoat(bid, { BHID: null });

      dirtyBIDs.value.delete(bid);
      await loadData();

      toast.add({
        severity: "success",
        summary: "Boat removed",
        detail: "Position deleted and BHID cleared.",
        life: 1500,
      });
    } catch (err) {
      console.error(err);
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "Failed to remove boat from hall",
        life: 2000,
      });
    }
  });
}

function onKeyDown(e) {
  if (e.key === "Escape" && placingBoat.value) {
    cancelPlacing();
  }
}

async function loadData() {
  try {
    loading.value = true;
    const bhid = Number(route.params.id);

    hall.value = await getBoathall(bhid);

    const rawPositions = await getHallPositions(bhid);
    const allBoats = await getBoats();

    positions.value = rawPositions.map((p) => ({
      ...p,
      Boat: allBoats.find((b) => b.BID === p.BID) || null,
    }));

    const boatsAssignedNoPos = allBoats.filter(
      (b) => b.BHID === bhid && !positions.value.some((p) => p.BID === b.BID)
    );

    const boatsUnassigned = allBoats.filter((b) => b.BHID === null);

    freeBoats.value = [...boatsAssignedNoPos, ...boatsUnassigned];

    await nextTick();
    await drawHallAndBoats();
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load hall or positions",
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function drawHallAndBoats() {
  if (!map.value || !hall.value) return;

  disableDragging();
  vectorSource.clear();

  const hallWidth = Number(hall.value.Width);
  const hallLength = Number(hall.value.Length);
  if (!hallWidth || !hallLength) return;

  const hallGeom = new Polygon([
    [
      [0, 0],
      [hallWidth, 0],
      [hallWidth, hallLength],
      [0, hallLength],
      [0, 0],
    ],
  ]);

  const hallFeature = new Feature(hallGeom);
  hallFeature.setStyle(
    new Style({
      stroke: new Stroke({ color: "#999", width: 2 }),
      fill: new Fill({ color: "rgba(200,200,200,0.15)" }),
    })
  );
  hallFeature.isBoat = false;
  vectorSource.addFeature(hallFeature);

  positions.value.forEach((pos) => {
    const x = Number(pos.PosX);
    const y = Number(pos.PosY);
    const w = Number(pos.Width);
    const h = Number(pos.Length);

    if ([x, y, w, h].some((n) => Number.isNaN(n))) return;

    const isHighlighted = highlightBoatId.value === pos.BID;
    const yMapped = hallLength - y - h;

    const geom = new Polygon([
      [
        [x, yMapped],
        [x + w, yMapped],
        [x + w, yMapped + h],
        [x, yMapped + h],
        [x, yMapped],
      ],
    ]);

    const f = new Feature(geom);

    const baseColor = isHighlighted ? "#2563eb" : "#0f766e";
    const isDirty = dirtyBIDs.value.has(pos.BID);

    f.setStyle(
      new Style({
        stroke: new Stroke({
          color: baseColor,
          width: isHighlighted ? 3 : 1.5,
        }),
        fill: new Fill({
          color: isDirty
            ? "rgba(245,158,11,0.35)"
            : isHighlighted
            ? "rgba(37,99,235,0.35)"
            : "rgba(15,118,110,0.25)",
        }),
        text: new Text({
          text: pos.Boat?.name || `BID ${pos.BID}`,
          font: "12px sans-serif",
          fill: new Fill({ color: "#111" }),
        }),
      })
    );

    f.isBoat = true;
    f.BID = pos.BID;
    vectorSource.addFeature(f);
  });

  const extent = [0, 0, hallWidth, hallLength];
  await nextTick();
  map.value.updateSize();
  map.value.getView().fit(extent, {
    size: map.value.getSize(),
    padding: [20, 20, 20, 20],
    constrainResolution: false,
  });

  if (placingBoat.value) {
    disableDragging();
    setCursor("crosshair");
    return;
  }
}

function saveLayout() {
  toast.add({
    severity: "info",
    summary: "Layout",
    detail: placingBoat.value
      ? "Place mode: click map to place. ESC cancels."
      : "Edit mode: drag boats. Save/Finish to persist.",
    life: 2500,
  });
}

onMounted(async () => {
  initMap();
  await loadData();
});

watch(
  () => route.params.id,
  async () => {
    editMode.value = false;
    dirtyBIDs.value.clear();
    cancelPlacing();
    await loadData();
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown);
  if (map.value) {
    disableDragging();
    map.value.setTarget(null);
    map.value = null;
  }
});
</script>
