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

      <div class="flex items-center gap-2">
        <span v-if="highlightBoatName" class="text-sm text-gray-600">
          Highlight boat:
          <strong>{{ highlightBoatName }}</strong>
        </span>
      </div>
    </div>

    <!-- GŁÓWNY UKŁAD: lewy panel + mapa -->
    <div class="flex gap-4 flex-1 min-h-0">
      <!-- PANEL Z ŁODZIAMI BEZ POZYCJI -->
      <div class="w-64 border p-3 rounded-xl overflow-auto bg-white">
        <h3 class="font-semibold mb-2">Unassigned boats</h3>

        <div
          v-if="freeBoats.length === 0"
          class="text-xs text-gray-500 italic"
        >
          All boats in this hall have positions.
        </div>

        <div
          v-for="boat in freeBoats"
          :key="boat.BID"
          class="p-2 border rounded mb-2 cursor-pointer hover:bg-gray-100"
          @dblclick="placeBoatFromList(boat)"
        >
          <div class="text-sm font-medium truncate">
            {{ boat.name || ('BID ' + boat.BID) }}
          </div>
          <div class="text-xs text-gray-500 truncate">
            Owner: {{ boat.User?.Name }} {{ boat.User?.Lastname }}
          </div>
          <div class="text-[10px] text-gray-400 mt-1">
            (Double-click to place)
          </div>
        </div>
      </div>

      <!-- MAPA -->
      <div class="flex-1 border rounded-xl overflow-hidden relative">
        <div ref="mapEl" class="w-full h-full"></div>

        <!-- fallback overlay gdy brak pozycji -->
        <div
          v-if="!loading && (!hall || positions.length === 0)"
          class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none"
        >
          No positions for this hall.
        </div>
      </div>
    </div>

    <!-- PRZYCISK "ZAPISZ UKŁAD" (opcjonalny, wszystko i tak zapisujemy na bieżąco) -->
    <div class="flex justify-end">
      <Button
        icon="pi pi-save"
        label="Save layout"
        severity="success"
        @click="saveLayout"
      />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  onMounted,
  watch,
  computed,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";

import Button from "primevue/button";

import { getBoathall } from "../services/boathallService";
import {
  getHallPositions,
  createBoatPosition,
  updateBoatPosition,
  deleteBoatPosition,
} from "../services/boatPositionService";

import { getBoats, updateBoat } from "../services/boatService";

// OpenLayers
import Map from "ol/Map";
import View from "ol/View";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import Polygon from "ol/geom/Polygon";
import { Style, Stroke, Fill, Text } from "ol/style";
import Translate from "ol/interaction/Translate";
import { Select } from "ol/interaction";

import "ol/ol.css";

const route = useRoute();
const toast = useToast();

const mapEl = ref(null);
const map = ref(null);
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({ source: vectorSource });
let translateInteraction = null;
let selectInteraction = null;

const hall = ref(null);
const positions = ref([]); // pozycje z backendu + Boat
const loading = ref(true);

const freeBoats = ref([]); // łodzie bez pozycji w tej hali + w ogóle nie przypisane
// (draggedBoat już nie używamy – było do drag&drop z listy)

// ?boat=ID w URL, np. /hall/1?boat=2
const highlightBoatId = computed(() => {
  const val = route.query.boat;
  return val ? Number(val) : null;
});

const highlightBoatName = computed(() => {
  const b = positions.value.find((p) => p.BID === highlightBoatId.value);
  return b?.Boat?.name || null;
});

//
// -------------------- POMOCNICZE: KOLIZJE --------------------
//
function intersects(a, b) {
  return !(
    a.PosX + a.Width <= b.PosX ||
    a.PosX >= b.PosX + b.Width ||
    a.PosY + a.Length <= b.PosY ||
    a.PosY >= b.PosY + b.Length
  );
}

function collides(item, list, hallObj) {
  const hallWidth = Number(hallObj.Width);
  const hallLength = Number(hallObj.Length);

  if (
    item.PosX < 0 ||
    item.PosY < 0 ||
    item.PosX + item.Width > hallWidth ||
    item.PosY + item.Length > hallLength
  ) {
    return true;
  }

  return list.some((p) => p.BID !== item.BID && intersects(item, p));
}

//
// -------------------- ZAPIS/UPDATE POZYCJI W BACKENDZIE --------------------
//
async function saveOrUpdatePosition(pos) {
  // jeśli pozycja już ma ID → UPDATE
  if (pos.PositionID) {
    await updateBoatPosition(pos.PositionID, {
      PosX: pos.PosX,
      PosY: pos.PosY,
      Width: pos.Width,
      Length: pos.Length,
      BHID: hall.value.BHID,
      BID: pos.BID,
    });
    return;
  }

  // pierwszy raz → CREATE
  const created = await createBoatPosition({
    BHID: hall.value.BHID,
    BID: pos.BID,
    PosX: pos.PosX,
    PosY: pos.PosY,
    Width: pos.Width,
    Length: pos.Length,
  });

  // backend powinien zwrócić PositionID
  pos.PositionID = created.PositionID || created.PositionId || created.id;
}

//
// -------------------- DRAGOWANIE ŁODZI NA MAPIE --------------------
//
function enableBoatDragging() {
  if (!map.value) return;

  // usuń stare interakcje jeśli były
  if (translateInteraction) map.value.removeInteraction(translateInteraction);
  if (selectInteraction) map.value.removeInteraction(selectInteraction);

  // zaznaczanie feature – tylko łodzie
  selectInteraction = new Select({
    layers: [vectorLayer],
    filter: (feature) => feature.isBoat === true,
  });

  // przeciąganie
  translateInteraction = new Translate({
    features: selectInteraction.getFeatures(),
  });

  // po skończonym przeciąganiu (puszczenie myszy)
  translateInteraction.on("translateend", async (e) => {
    const f = e.features.item(0);
    if (!f) return;

    const geom = f.getGeometry();
    const coords = geom.getCoordinates()[0];

    // nowy X,Y → lewy dolny róg
    const newX = coords[0][0];
    const newYmapped = coords[0][1];
    const L = Number(hall.value.Length);

    const p = positions.value.find((pos) => pos.BID === f.BID);
    if (!p) return;

    const oldPos = { ...p };

    p.PosX = newX;
    p.PosY = L - newYmapped - p.Length;

    if (collides(p, positions.value, hall.value)) {
      toast.add({
        severity: "warn",
        summary: "Collision",
        detail: "Boat overlaps another or goes out of hall.",
        life: 1500,
      });

      // przywróć stare współrzędne
      p.PosX = oldPos.PosX;
      p.PosY = oldPos.PosY;
      drawHallAndBoats();
      return;
    }

    try {
      await saveOrUpdatePosition(p);
      toast.add({
        severity: "success",
        summary: "Position saved",
        life: 1000,
      });
    } catch (err) {
      console.error(err);
      // rollback przy błędzie backendu
      p.PosX = oldPos.PosX;
      p.PosY = oldPos.PosY;
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "Failed to save position",
        life: 2500,
      });
    }

    drawHallAndBoats();
  });

  map.value.addInteraction(selectInteraction);
  map.value.addInteraction(translateInteraction);
}

//
// -------------------- INIT MAPY --------------------
//
function initMap() {
  if (!mapEl.value) return;

  map.value = new Map({
    target: mapEl.value,
    layers: [vectorLayer],
    interactions: [], // własne interakcje zarządzamy ręcznie
    controls: [],
    view: new View({
      center: [0, 0],
      zoom: 1,
      constrainOnlyCenter: true,
      enableRotation: false,
    }),
  });

  // PRAWY KLIK NA MAPIE → USUNIĘCIE ŁODZI Z HALI
  map.value.on("contextmenu", async (e) => {
    e.preventDefault();

    const pixel = map.value.getEventPixel(e.originalEvent);
    const feature = map.value.forEachFeatureAtPixel(pixel, (f) => f);

    if (!feature?.isBoat) return;

    const bid = feature.BID;
    const pos = positions.value.find((p) => p.BID === bid);
    if (!pos) return;

    const positionId = pos.PositionID;

    try {
      // 1️⃣ usuń pozycję po PositionID
      if (positionId) {
        await deleteBoatPosition(positionId);
      }

      // 2️⃣ odspawaj łódź od hali (BHID = null)
      await updateBoat(bid, { BHID: null });

      // 3️⃣ frontend: usuń z positions, dodaj do freeBoats
      positions.value = positions.value.filter((p) => p.BID !== bid);

      const boat = pos.Boat;
      if (boat) {
        boat.BHID = null;
        freeBoats.value.push(boat);
      }

      toast.add({
        severity: "success",
        summary: "Boat removed",
        detail: "Position deleted and BHID cleared.",
        life: 1500,
      });

      drawHallAndBoats();
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

//
// -------------------- AUTO-UMIESZCZENIE ŁODZI Z LISTY (DOUBLE-CLICK) --------------------
//
async function placeBoatFromList(boat) {
  if (!hall.value) return;

  const hallWidth = Number(hall.value.Width);
  const hallLength = Number(hall.value.Length);

  // rozmiar łodzi – z dimensions, jak nie ma to domyślne
  const defaultW = Number(
    boat.BoatDimensions?.Width || boat.Width || 200
  );
  const defaultH = Number(
    boat.BoatDimensions?.Length || boat.Length || 600
  );

  // prosty grid do szukania pierwszego wolnego miejsca
  const step = 50; // możesz zmienić np. na 100 lub margin z hali

  let found = null;

  outer: for (let y = 0; y <= hallLength - defaultH; y += step) {
    for (let x = 0; x <= hallWidth - defaultW; x += step) {
      const candidate = {
        BID: boat.BID,
        PosX: x,
        PosY: y,
        Width: defaultW,
        Length: defaultH,
      };

      if (!collides(candidate, positions.value, hall.value)) {
        found = candidate;
        break outer;
      }
    }
  }

  if (!found) {
    toast.add({
      severity: "warn",
      summary: "No space",
      detail: "No free spot found for this boat.",
      life: 2500,
    });
    return;
  }

  try {
    // zapis pozycji
    await updateBoat(boat.BID, { BHID: hall.value.BHID });

    const created = await createBoatPosition({
      BHID: hall.value.BHID,
      BID: boat.BID,
      PosX: found.PosX,
      PosY: found.PosY,
      Width: found.Width,
      Length: found.Length,
    });

    const positionId = created.PositionID || created.PositionId || created.id;

    // przypisz łódź do hali (BHID)
    
    // aktualizacja frontu
    const boatWithHall = { ...boat, BHID: hall.value.BHID };

    positions.value.push({
      PositionID: positionId,
      BHID: hall.value.BHID,
      BID: boat.BID,
      PosX: found.PosX,
      PosY: found.PosY,
      Width: found.Width,
      Length: found.Length,
      Boat: boatWithHall,
    });

    freeBoats.value = freeBoats.value.filter((b) => b.BID !== boat.BID);

    toast.add({
      severity: "success",
      summary: "Boat placed",
      detail: "Boat placed at first free spot.",
      life: 1500,
    });

    drawHallAndBoats();
  } catch (err) {
    console.error(err);
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to place boat",
      life: 2500,
    });
  }
}

//
// -------------------- ŁADOWANIE DANYCH --------------------
//
async function loadData() {
  try {
    loading.value = true;
    const bhid = Number(route.params.id);

    // dane hali
    hall.value = await getBoathall(bhid);

    // istniejące pozycje łodzi
    const rawPositions = await getHallPositions(bhid);

    // wszystkie łodzie
    const allBoats = await getBoats();

    // pozycje + powiązane łodzie
    positions.value = rawPositions.map((p) => ({
      ...p,
      Boat: allBoats.find((b) => b.BID === p.BID) || null,
    }));

    // łodzie przypisane do tej hali BEZ pozycji
    const boatsAssignedNoPos = allBoats.filter(
      (b) => b.BHID === bhid && !positions.value.some((p) => p.BID === b.BID)
    );

    // łodzie w ogóle nieprzypisane (BHID null)
    const boatsUnassigned = allBoats.filter((b) => b.BHID === null);

    freeBoats.value = [...boatsAssignedNoPos, ...boatsUnassigned];

    await nextTick();
    drawHallAndBoats();
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

//
// -------------------- RYSOWANIE HALI I ŁODZI --------------------
//
async function drawHallAndBoats() {
  if (!map.value || !hall.value) {
    console.warn("drawHallAndBoats: no map or hall yet");
    return;
  }

  vectorSource.clear();

  const hallWidth = Number(hall.value.Width); // cm (X)
  const hallLength = Number(hall.value.Length); // cm (Y)

  if (!hallWidth || !hallLength) {
    console.warn("Invalid hall dimensions:", hall.value);
    return;
  }

  // prostokąt hali
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

  // łodzie
  positions.value.forEach((pos) => {
    const x = Number(pos.PosX);
    const y = Number(pos.PosY);
    const w = Number(pos.Width);
    const h = Number(pos.Length);

    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
      console.warn("Invalid position for boat:", pos);
      return;
    }

    const isHighlighted = highlightBoatId.value === pos.BID;

    // odwrócenie osi Y – PosY liczony od góry
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

    f.setStyle(
      new Style({
        stroke: new Stroke({
          color: baseColor,
          width: isHighlighted ? 3 : 1.5,
        }),
        fill: new Fill({
          color: isHighlighted
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

  // dopasuj widok do hali
  const extent = [0, 0, hallWidth, hallLength];
  await nextTick();
map.value.updateSize();
map.value.getView().fit(extent, {
  size: map.value.getSize(),
  padding: [20, 20, 20, 20],
  constrainResolution: false,
});


  enableBoatDragging();
}

//
// -------------------- "ZAPISZ UKŁAD" (opcjonalne) --------------------
//
async function saveLayout() {
  // wszystko i tak jest zapisywane na bieżąco (create/update przy ruchu),
  // więc tutaj tylko info:
  console.log("Current layout:", positions.value);
  toast.add({
    severity: "info",
    summary: "Layout",
    detail: "Layout is saved automatically on every move / add / delete.",
    life: 2500,
  });
}

//
// -------------------- LIFECYCLE --------------------
//
onMounted(async () => {
  initMap();
  await loadData();
});

// przeładowanie przy zmianie query ?boat=...
watch(highlightBoatId, () => {
  drawHallAndBoats();
});

// jeśli zmieni się id hali w URL
watch(
  () => route.params.id,
  async () => {
    await loadData();
  }
);

onBeforeUnmount(() => {
  if (map.value) {
    map.value.setTarget(null);
    map.value = null;
  }
});
</script>
