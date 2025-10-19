<template>
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
    <div><span class="font-semibold">Brand:</span> {{ boat.EngineInformation?.Brand }}</div>
    <div><span class="font-semibold">Model:</span> {{ boat.EngineInformation?.Model }}</div>
    <div><span class="font-semibold">Engine Nr:</span> {{ boat.EngineInformation?.Engine_nr }}</div>
    <div><span class="font-semibold">Reversing Gear:</span> {{ boat.EngineInformation?.Reversing_gear }}</div>
    <div><span class="font-semibold">Sterndrive:</span> {{ boat.EngineInformation?.Sterndrive }}</div>
    <div><span class="font-semibold">Transom:</span> {{ boat.EngineInformation?.Transom }}</div>
    <div><span class="font-semibold">Motor Hours:</span> {{ boat.EngineInformation?.Moto_H }}</div>
  </div>
</template>

<script setup>
defineProps({
  boat: Object
});
</script>
