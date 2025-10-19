<template>
  <div
    class="h-screen bg-surface-100 dark:bg-surface-900 overflow-hidden p-2 md:p-3 lg:p-4"
  >
    <!-- Grid z marginesami -->
    <div
      class="h-full grid grid-rows-[auto_1fr] grid-cols-[auto_1fr] gap-2 md:gap-3 lg:gap-4"
    >
      <!-- Top panel -->
      <TopPanel
        class="col-span-2 z-20 rounded-2xl shadow bg-white dark:bg-surface-800"
        @toggleSidebar="SidePanelOpen = !SidePanelOpen"
      />

      <!-- Side panel -->
      <SidePanelNew
        :isOpen="SidePanelOpen"
        @close="SidePanelOpen = false"
        class="row-start-2 col-start-1 rounded-2xl shadow bg-white dark:bg-surface-800"
      />

      <!-- Main content -->
      <main
        class="row-start-2 col-start-2 flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-surface-800 shadow"
      >
        <div class="flex-1 overflow-y-auto p-4 md:p-6">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import SidePanelNew from "../components/SidePanelNew.vue";
import TopPanel from "../components/TopPanel.vue";

const SidePanelOpen = ref(false);
</script>
