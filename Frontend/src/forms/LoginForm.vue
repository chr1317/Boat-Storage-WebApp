<template>
  <div class="card flex justify-center">
    <Toast />
    <Form
      ref="formRef"
      @submit="handleLogin"
      class="flex flex-col gap-4 w-full sm:w-60"
    >
      <!-- Email -->
      <div class="flex flex-col gap-1">
        <InputText
          v-model="email"
          type="text"
          placeholder="Email"
          fluid
        />
      </div>

      <!-- Password -->
      <div class="flex flex-col gap-1">
        <Password
          v-model="password"
          placeholder="Password"
          :feedback="false"
          toggleMask
          fluid
        />
      </div>

      <Button
        type="submit"
        severity="secondary"
        :label="t('login.login')"
        :loading="loading"
      />
    </Form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n({ useScope: "global" });
const toast = useToast();
const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const loading = ref(false);

async function handleLogin() {
  if (!email.value || !password.value) {
    toast.add({
      severity: "warn",
      summary: t("login.missing_fields"),
      detail: t("login.missing_fields_detail") || "Please enter your email and password.",
      life: 3000,
    });
    return;
  }

  loading.value = true;
  try {
    const res = await auth.login({
      Email: email.value,
      Password: password.value,
    });

    // 🔸 jeśli backend zwraca mustChangePassword
    if (res.mustChangePassword) {
      toast.add({
        severity: "warn",
        summary: "Change required",
        detail: "You must set a new password before logging in.",
        life: 3000,
      });
      router.push({
        name: "SetPassword",
        query: { uid: res.userId },
      });
      return;
    }

    toast.add({
      severity: "success",
      summary: "Login successful",
      detail: t("login.login_success"),
      life: 3000,
    });

    const redirect = router.currentRoute.value.query.redirect || "/home/dashboard";
    router.push(redirect);
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Login failed",
      detail: t("login.login_error") + ": " + err.message,
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}
</script>
