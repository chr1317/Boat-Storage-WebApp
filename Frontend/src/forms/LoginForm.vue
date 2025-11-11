<template>
  <div class="card flex justify-center">
    <Toast />
    <Form
      ref="formRef"
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="HandleLogin"
      class="flex flex-col gap-4 w-full sm:w-60"
    >
      <div class="flex flex-col gap-1">
  <InputText name="email" type="text" placeholder="Email" fluid />
  <Message
    v-if="$form.email?.invalid"
    severity="error"
    size="small"
    variant="simple"
    class="text-sm leading-tight"
  >
    {{ $form.email.error.message }}
  </Message>
</div>

<div class="flex flex-col gap-1">
  <Password name="password" placeholder="Password" :feedback="false" toggleMask fluid />
  <Message
    v-if="$form.password?.invalid"
    severity="error"
    size="small"
    variant="simple"
    class="text-sm leading-tight"
  >
    <div v-for="(error, index) in $form.password.errors" :key="index">
      {{ error.message }}
    </div>
  </Message>
</div>
      <Button type="submit" severity="secondary" :label="t('login.login')" />
    </Form>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const formRef = ref(null);
const { t, locale } = useI18n({ useScope: 'global' });

const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const initialValues = ref({
  email: '',
  password: '',
});

const resolver = computed (() => zodResolver(
    z.object({
      email: z.string().email({ message: t('login.bad_email_format') }),
      password: z
        .string()
        .min(6, { message: t('login.password_min_length') })
        .max(50, { message: t('login.password_max_length') })
        .refine((value) => /[a-z]/.test(value), {
          message: t('login.password_lowercase_req'),
        })
        .refine((value) => /[A-Z]/.test(value), {
          message: t('login.password_uppercase_req'),
        })
        .refine((value) => /[0-9]/.test(value), {
          message: t('login.password_number_req'),
        })
        .refine((value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value), {
          message: t('login.password_special_req'),
        }),
    })
  )
);
watch(locale, async () => {
  await nextTick();
  if (formRef.value) {
    formRef.value.validate();
  }
});

async function HandleLogin(values) {
  try {
    const res = await auth.login({
      Email: values.states.email.value,
      Password: values.states.password.value,
    });

    // 🟠 Jeśli hasło tymczasowe — przekieruj do zmiany
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

    // ✅ normalny login
    toast.add({
      severity: "success",
      summary: "Login successful",
      detail: t("login.login_success"),
      life: 3000,
    });

    const redirect = router.currentRoute.value.query.redirect || "/dashboard";
    router.push(redirect);
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Login failed",
      detail: t("login.login_error") + ": " + err.message,
      life: 3000,
    });
  }
}

</script>

