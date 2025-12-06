<template>
  <Dialog
    v-model:visible="visibleModel"
    modal
    :header="dialogHeader"
    :style="dialogStyle"
    @show="handleShow"
    @hide="handleHide"
  >
    <div class="minimap-wrapper">
      <div ref="mapEl" class="minimap-map"></div>

      <div v-if="loading" class="loading-center">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
      </div>

      <div v-if="!loading && (!hall || !hallPositions.length)" class="loading-center">
        No positions available.
      </div>

      <!-- TOOLTIP -->
      <div ref="tooltipEl" class="boat-tooltip" v-show="tooltip.visible">
        {{ tooltip.text }}
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import Dialog from "primevue/dialog";

import Map from "ol/Map";
import View from "ol/View";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import Polygon from "ol/geom/Polygon";
import { Style, Stroke, Fill } from "ol/style";
import Overlay from "ol/Overlay";
import "ol/ol.css";

import { getBoathall } from "../../services/boathallService";
import { getHallPositions } from "../../services/boatPositionService";

const props = defineProps({
  visible: Boolean,
  boatId: Number,
  bhid: Number,
});

const emit = defineEmits(["update:visible"]);

const visibleModel = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
});

let mapInstance = null;
let tooltipOverlay = null;

const mapEl = ref(null);
const tooltipEl = ref(null);

const hall = ref(null);
const hallPositions = ref([]);
const loading = ref(true);

const SCALE = 0.1;

const tooltip = ref({
  visible: false,
  text: "",
});

const dialogHeader = computed(() =>
  hall.value ? `Boat in Hall: ${hall.value.Name || hall.value.BHID}` : "Boat position"
);

const dialogStyle = computed(() => ({
  width: window.innerWidth < 768 ? "95vw" : "90vw",
  height: window.innerWidth < 768 ? "75vh" : "85vh",
}));

watch(
  () => props.visible,
  async (v) => {
    if (v) await loadData();
  }
);

async function loadData() {
  loading.value = true;
  hall.value = await getBoathall(props.bhid);
  hallPositions.value = await getHallPositions(props.bhid);
  loading.value = false;
}

function handleHide() {
  if (mapInstance) {
    mapInstance.setTarget(null);
    mapInstance = null;
  }
}

async function handleShow() {
  await nextTick();

  setTimeout(() => {
    if (!mapEl.value) return;

    initMap();
    draw();
    setupHoverTooltip();
  }, 200);
}

function initMap() {
  const vectorSource = new VectorSource();
  const vectorLayer = new VectorLayer({ source: vectorSource });

  mapInstance = new Map({
    target: mapEl.value,
    layers: [vectorLayer],
    controls: [],
    interactions: [],
    view: new View({
      zoom: 1,
      center: [0, 0],
    }),
  });

  mapInstance.vectorSource = vectorSource;

  // Tooltip overlay
  tooltipOverlay = new Overlay({
    element: tooltipEl.value,
    offset: [10, 10],
    positioning: "top-left",
  });

  mapInstance.addOverlay(tooltipOverlay);
}

function draw() {
  if (!mapInstance || !hall.value) return;

  const src = mapInstance.vectorSource;
  src.clear();

  const W = Number(hall.value.Width) * SCALE;
  const H = Number(hall.value.Length) * SCALE;

  const hallPoly = new Polygon([
    [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
      [0, 0],
    ],
  ]);

  const hallFeature = new Feature(hallPoly);
  hallFeature.setStyle(
    new Style({
      stroke: new Stroke({ color: "#333", width: 2 }),
      fill: new Fill({ color: "rgba(180,180,180,0.2)" }),
    })
  );

  src.addFeature(hallFeature);

  // Boats
  hallPositions.value.forEach((p) => {
    const px = Number(p.PosX) * SCALE;
    const py = Number(p.PosY) * SCALE;
    const pw = Number(p.Width) * SCALE;
    const ph = Number(p.Length) * SCALE;

    const mappedY = H - py - ph;

    const poly = new Polygon([
      [
        [px, mappedY],
        [px + pw, mappedY],
        [px + pw, mappedY + ph],
        [px, mappedY + ph],
        [px, mappedY],
      ],
    ]);

    const feature = new Feature(poly);

    const isTarget = p.BID == props.boatId;

    feature.set("boatName", p.Boat?.name || `Boat ${p.BID}`);

    feature.setStyle(
      new Style({
        stroke: new Stroke({
          color: isTarget ? "#2563eb" : "#0f766e",
          width: isTarget ? 3 : 2,
        }),
        fill: new Fill({
          color: isTarget ? "rgba(37,99,235,0.35)" : "rgba(15,118,110,0.25)",
        }),
      })
    );

    src.addFeature(feature);
  });

  mapInstance.getView().fit([0, 0, W, H], {
    padding: [20, 20, 20, 20],
    constrainResolution: false,
  });

  setTimeout(() => mapInstance.updateSize(), 50);
}

function setupHoverTooltip() {
  mapInstance.on("pointermove", (evt) => {
    if (evt.dragging) return;

    const feature = mapInstance.forEachFeatureAtPixel(evt.pixel, (f) => f);

    if (feature && feature.get("boatName")) {
      tooltip.value.text = feature.get("boatName");
      tooltip.value.visible = true;

      tooltipOverlay.setPosition(evt.coordinate);
    } else {
      tooltip.value.visible = false;
    }
  });

  // mobile tap
  mapInstance.on("click", (evt) => {
    const feature = mapInstance.forEachFeatureAtPixel(evt.pixel, (f) => f);

    if (feature && feature.get("boatName")) {
      tooltip.value.text = feature.get("boatName");
      tooltip.value.visible = true;
      tooltipOverlay.setPosition(evt.coordinate);
    } else {
      tooltip.value.visible = false;
    }
  });
}
</script>

<style>
.p-dialog-content {
  padding: 0 !important;
  height: calc(100% - 50px) !important;
}

.minimap-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f8f9fa;
}

.minimap-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.boat-tooltip {
  position: absolute;
  background: #111;
  color: white;
  padding: 6px 10px;
  font-size: 14px;
  border-radius: 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 50;
  opacity: 0.9;
}

.loading-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
