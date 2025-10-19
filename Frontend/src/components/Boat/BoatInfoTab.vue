<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span class="font-semibold">Type:</span>
      <p>{{ boat.Type }}</p>
    </div>
    <div>
      <span class="font-semibold">Drive:</span>
      <p>{{ boat.Drive }}</p>
    </div>
    <div>
      <span class="font-semibold">Length:</span>
      <p>{{ boat.BoatDimension?.Length }} cm</p>
    </div>
    <div>
      <span class="font-semibold">Width:</span>
      <p>{{ boat.BoatDimension?.Width }} cm</p>
    </div>
    <div>
      <span class="font-semibold">Height:</span>
      <p>{{ boat.BoatDimension?.Height }} cm</p>
    </div>
    <div>
      <span class="font-semibold">Weight:</span>
      <p>{{ boat.BoatDimension?.Weight }} kg</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  boat: Object
});
</script>
