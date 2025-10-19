<template>
  <header
    class="flex items-center justify-between h-16 bg-white dark:bg-surface-800 px-4 md:px-6 shadow rounded-b-2xl relative"
  >
    <!-- Lewa sekcja -->
    <div class="flex items-center gap-3">
      <!-- Hamburger tylko na mobile -->
      <Button
        icon="pi pi-bars"
        text
        rounded
        class="md:hidden"
        @click="$emit('toggleSidebar')"
      />

      <!-- Nazwa aktualnej strony (tylko desktop) -->
      <h1 class="hidden md:block text-lg font-semibold text-surface-700 dark:text-surface-0">
        {{ currentPage }}
      </h1>
    </div>

    <!-- Środek: logo BoatHall -->
    <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 select-none">
      <img
        src="../assets/BoatLogoBGrem.png"
        alt="logo"
        class="w-10 h-10 transition-transform duration-200 hover:scale-105"
      />
      <span class="font-bold text-xl text-primary">BoatHall</span>
    </div>

    <!-- Prawa sekcja -->
    <div class="flex items-center gap-3">
      <LangChanger />
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        @click="toggleTheme"
        text
        rounded
      />
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import LangChanger from "./LangChanger.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["toggleSidebar"]);
const isDark = ref(false);
const route = useRoute();
const { t, locale } = useI18n({ useScope: 'global' });

const currentPage = computed(() => {
  return t(`routes.${route.name}`); // np. routes.Dashboard
});


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
