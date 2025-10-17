<template>
  <div class="card flex justify-center">
    <Drawer v-model:visible="visible">
      <template #container="{ closeCallback }">
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between px-6 pt-4 shrink-0">
            <span class="inline-flex items-center gap-2">
              <img src="../assets/BoatLogoBGrem.png" alt="logo" class="w-12 h-12" />
              <span class="font-semibold text-2xl text-primary">BoatHall</span>
            </span>
            <Button type="button" @click="closeCallback" icon="pi pi-times" rounded variant="outlined" />
          </div>

          <div class="overflow-y-auto flex-1">
            <ul class="list-none p-4 m-0">
              <li>
                <a
                  v-ripple
                  class="flex items-center cursor-pointer p-4 rounded text-surface-700 hover:bg-surface-100 dark:text-surface-0 dark:hover:bg-surface-800 duration-150 transition-colors"
                >
                  <i class="pi pi-home mr-2"></i>
                  <span class="font-medium">Dashboard</span>
                </a>
              </li>
              <li>
                <a
                  v-ripple
                  class="flex items-center cursor-pointer p-4 rounded text-surface-700 hover:bg-surface-100 dark:text-surface-0 dark:hover:bg-surface-800 duration-150 transition-colors"
                >
                  <i class="pi pi-cog mr-2"></i>
                  <span class="font-medium">Settings</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="flex justify-center mt-4 mb-6">
            <Button
            :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
            @click="isDark = !isDark"
            class="!w-10 !h-10 !rounded-full bg-transparent border-none text-primary hover:text-primary-700 dark:text-surface-0 dark:hover:text-primary transition-all duration-200"
            />
            <LangChanger />
          </div>

          <div class="mt-auto">
            <hr class="mb-4 mx-4 border-t border-0 border-surface-200 dark:border-surface-700" />
            <a
              v-ripple
              class="m-4 flex items-center cursor-pointer p-4 gap-2 rounded text-surface-700 hover:bg-surface-100 dark:text-surface-0 dark:hover:bg-surface-800 duration-150 transition-colors"
            >
              <i class="pi pi-user mr-2"></i>
              <span class="font-bold">{{ auth.user.Name || "User" }}</span>
            </a>
            <Button
            icon="pi pi-sign-out"
            :label="$t('login.logout')"
            severity="danger"
            outlined
            class="w-full"
            @click="handleLogout"
            />
          </div>
        </div>
      </template>
    </Drawer>

    <Button icon="pi pi-bars" @click="visible = true" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import LangChanger from "./LangChanger.vue";

const router = useRouter();
const auth = useAuthStore();

const visible = ref(false);
const isDark = ref(false);

watch(isDark, (val) => {
  document.documentElement.classList.toggle("my-app-dark", val);
  localStorage.setItem("theme", val ? "dark" : "light");
});

async function handleLogout() {
    await auth.logout();
    router.push('/login');
}

onMounted(() => {
  const saved = localStorage.getItem("theme");
  isDark.value =
    saved === "dark" ||
    (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("my-app-dark", isDark.value);
});
</script>
