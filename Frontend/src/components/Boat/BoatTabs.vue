<template>
  <Tabs value="info" class="p-4">
    <TabList>
      <Tab value="info">{{ t("boat.info") }}</Tab>
      <Tab value="dimensions">{{ t("boat.dimensions") }}</Tab>
      <Tab value="engine">{{ t("boat.engine") }}</Tab>
      <Tab value="service">{{ t("boat.service") }}</Tab>
      <Tab value="position">{{ t("boat.position") }}</Tab>
    </TabList>

    <TabPanels>
      <TabPanel value="info"><BoatInfoTab :boat="boat" /></TabPanel>
      <TabPanel value="dimensions"><BoatDimensionsTab :boat="boat" /></TabPanel>
      <TabPanel value="engine"><BoatEngineTab :boat="boat" /></TabPanel>
      <TabPanel value="service"><BoatServiceTab :boat="boat" /></TabPanel>
      <TabPanel value="position"><BoatPositionTab :boat="boat" /></TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import Tabs from "primevue/tabs";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";

import BoatInfoTab from "./BoatInfoTab.vue";
import BoatDimensionsTab from "./BoatDimensionsTab.vue";
import BoatEngineTab from "./BoatEngineTab.vue";
import BoatServiceTab from "./BoatServiceTab.vue";
import BoatPositionTab from "./BoatPositionTab.vue";

const props = defineProps({ boat: Object });
const { t } = useI18n({ useScope: "global" });
</script>
