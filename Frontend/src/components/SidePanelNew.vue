<template>
  <div>
    <!-- Overlay (mobile) -->
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/40 z-40 md:hidden"
      @click="$emit('close')"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'bg-white dark:bg-surface-800 shadow-lg transition-transform duration-300 ease-in-out w-64 flex flex-col overflow-hidden',
        'fixed inset-y-0 left-0 z-50 md:z-auto md:static md:translate-x-0 md:h-full',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'rounded-2xl'
      ]"
    >
      <!-- wrapper, który ustawia top i bottom -->
      <div class="flex flex-col h-full">
        <!-- NAV -->
        <nav class="flex flex-col px-4 pt-6 gap-2 flex-1">
          <a
            class="flex w-full items-center justify-center gap-3 p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer transition-colors duration-150"
          >
            <i class="pi pi-home text-lg"></i>
            <!-- ✅ tłumaczenie przez {{ }} -->
            <span class="font-medium">{{ t('routes.Dashboard') }}</span>
          </a>
          <!-- Boats -->
          <RouterLink
            v-if="['Admin', 'Employee'].includes(auth.role)"
            to="/boats"
            class="nav-link flex w-full items-center justify-center gap-3 p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer transition-colors duration-150"
            :class="{ active: route.path.startsWith('/boats') }"
          >
            <i class="pi pi-ship text-lg"></i>
            <span class="font-medium">{{ t('routes.Boats') }}</span>
          </RouterLink>

          <a
            class="flex w-full items-center justify-center gap-3 p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 cursor-pointer transition-colors duration-150"
          >
            <i class="pi pi-cog text-lg"></i>
            <span class="font-medium">{{ t('routes.Settings') }}</span>
          </a>
        </nav>

        <!-- STOPKA -->
        <div class="p-4 border-t border-surface-200 dark:border-surface-700">
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2 text-sm">
              <i class="pi pi-user"></i>
              <span>{{ auth.user.Name || "User" }}</span>
            </div>
            <Button
              icon="pi pi-sign-out"
              :label="t('login.logout')"  
              severity="danger"
              outlined
              class="w-full"
              @click="handleLogout"
            />
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { useAuthStore } from "../stores/auth";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const props = defineProps({ isOpen: Boolean });
const emit = defineEmits(["close"]);

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

// ✅ globalny kontekst tłumaczeń
const { t } = useI18n({ useScope: "global" });

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}
</script>
