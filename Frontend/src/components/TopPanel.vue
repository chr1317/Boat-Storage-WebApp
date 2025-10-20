<template>
  <header
    class="flex items-center justify-between h-16 bg-white dark:bg-surface-800 px-4 md:px-6 shadow rounded-b-2xl"
  >
    <!-- Lewa sekcja -->
    <div class="flex items-center gap-3 flex-1">
      <Button
        icon="pi pi-bars"
        text
        rounded
        class="md:hidden"
        @click="$emit('toggleSidebar')"
      />
      <h1 class="hidden md:block text-lg font-semibold text-surface-700 dark:text-surface-0 truncate">
        {{ currentPage }}
      </h1>
    </div>

    <!-- Środek: logo -->
    <router-link
      to="/dashboard"
      class="flex items-center gap-2 select-none hover:cursor-pointer flex-shrink-0 justify-center"
    >
      <img
        src="../assets/BoatLogoBGrem.png"
        alt="logo"
        class="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-200 hover:scale-105"
      />
      <span
        class="font-bold text-base sm:text-lg md:text-xl text-primary truncate max-w-[90px] sm:max-w-[120px]"
      >
        BoatHall
      </span>
    </router-link>

    <!-- Prawa sekcja -->
    <div class="flex items-center gap-3 flex-1 justify-end">
      <!-- Desktop: język i motyw -->
      <div class="hidden md:flex items-center gap-3">
        <LangChanger />
        <Button
          :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
          @click="toggleTheme"
          text
          rounded
        />
      </div>

      <!-- Mobile: przycisk ustawień -->
      <Button
        icon="pi pi-cog"
        text
        rounded
        class="md:hidden"
        @click="showSettings = true"
      />
    </div>

    <!-- 🔹 Mobile dialog -->
    <Dialog
  v-model:visible="showSettings"
  modal
  dismissableMask
  :header="t('app.settings')"
  :style="{ width: '80vw', maxWidth: '400px' }"
>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <span>{{ t('app.language') }}</span>
      <LangChanger />
    </div>

    <div class="flex justify-between items-center">
      <span>{{ t('app.theme') }}</span>
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        @click="toggleTheme"
        text
        rounded
      />
    </div>
  </div>
</Dialog>
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import LangChanger from "./LangChanger.vue";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import Dialog from "primevue/dialog";

const emit = defineEmits(["toggleSidebar"]);
const isDark = ref(false);
const showSettings = ref(false);

const route = useRoute();
const { t } = useI18n({ useScope: "global" });

const currentPage = computed(() => t(`routes.${route.name}`));

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle("my-app-dark", isDark.value);
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
}

onMounted(() => {
  const saved = localStorage.getItem("theme");
  isDark.value =
    saved === "dark" ||
    (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("my-app-dark", isDark.value);
});
</script>
