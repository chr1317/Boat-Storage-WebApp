<template>
  <div class="card flex justify-center">
    <Toast />

    <div class="flex flex-col gap-4 w-full sm:w-60">
      <h2 class="text-xl font-semibold text-center mb-2">
        {{ t("password.change_title") }}
      </h2>

      <!-- New password -->
      <div class="flex flex-col gap-1">
        <Password
          v-model="password"
          placeholder="New password"
          toggleMask
          :feedback="false"
          fluid
        />
      </div>

      <!-- Confirm -->
      <div class="flex flex-col gap-1">
        <Password
          v-model="confirm"
          placeholder="Confirm password"
          toggleMask
          :feedback="false"
          fluid
        />
      </div>

      <Button
        label="Save"
        severity="secondary"
        class="w-full mt-2"
        :loading="loading"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import { apiFetch } from "../services/apiClient";

const { t } = useI18n({ useScope: "global" });
const route = useRoute();
const router = useRouter();
const toast = useToast();

const password = ref("");
const confirm = ref("");
const loading = ref(false);

async function handleSubmit() {
  if (password.value.length < 6) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Password must be at least 6 characters.",
      life: 3000,
    });
    return;
  }
  if (password.value !== confirm.value) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Passwords do not match.",
      life: 3000,
    });
    return;
  }

  loading.value = true;
  try {
    const uid = route.query.uid;
    await apiFetch(`/user/${uid}/set-password`, {
      method: "PUT",
      body: { newPassword: password.value },
    });

    toast.add({
      severity: "success",
      summary: "Password changed",
      detail: "You can now log in.",
      life: 3000,
    });

    router.push("/login");
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: err.message,
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.card {
  min-height: 100vh;
  align-items: center;
}
</style>
