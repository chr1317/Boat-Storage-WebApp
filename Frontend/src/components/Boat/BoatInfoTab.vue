<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span class="font-semibold">{{ t("boat.type") }}:</span>
      <p>{{ boat.Type }}</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.drive") }}:</span>
      <p>{{ boat.Drive }}</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.length") }}:</span>
      <p>{{ boat.BoatDimension?.Length }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.width") }}:</span>
      <p>{{ boat.BoatDimension?.Width }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.height") }}:</span>
      <p>{{ boat.BoatDimension?.Height }} cm</p>
    </div>

    <div>
      <span class="font-semibold">{{ t("boat.weight") }}:</span>
      <p>{{ boat.BoatDimension?.Weight }} kg</p>
    </div>
  </div>

</template>

<script setup>
import { useI18n } from "vue-i18n";


const { t } = useI18n({ useScope: "global" });

defineProps({
  boat: Object
});
</script>
