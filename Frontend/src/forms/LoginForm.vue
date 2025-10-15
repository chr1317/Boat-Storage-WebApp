<template>
  <div class="card flex justify-center">
    <Toast />
    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      @submit="HandleLogin"
      class="flex flex-col gap-4 w-full sm:w-60"
    >
      <div class="flex flex-col gap-1">
        <InputText name="email" type="text" placeholder="Email" fluid />
        <Message v-if="$form.email?.invalid" severity="error" size="small" variant="simple">
          {{ $form.email.error.message }}
        </Message>
      </div>
      <div class="flex flex-col gap-1">
        <Password name="password" placeholder="Password" :feedback="false" toggleMask fluid />
        <Message v-if="$form.password?.invalid" severity="error" size="small" variant="simple">
          <ul class="my-0 px-4 flex flex-col gap-1">
            <li v-for="(error, index) of $form.password.errors" :key="index">{{ error.message }}</li>
          </ul>
        </Message>
      </div>
      <Button type="submit" severity="secondary" label="Login" />
    </Form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { z } from 'zod';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import { useToast } from 'primevue/usetoast';
import * as AuthApi from '../services/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

const initialValues = ref({
  email: '',
  password: '',
});

const resolver = zodResolver(
  z.object({
    email: z.string().email({ message: 'Invalid email format' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters long' })
      .max(50, { message: 'Password must be at most 50 characters long' })
      .refine((value) => /[a-z]/.test(value), {
        message: 'Password must contain at least one lowercase letter',
      })
      .refine((value) => /[A-Z]/.test(value), {
        message: 'Password must contain at least one uppercase letter',
      })
      .refine((value) => /[0-9]/.test(value), {
        message: 'Password must contain at least one number',
      })
      .refine((value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value), {
        message: 'Password must contain at least one special character',
      }),
  })
);

async function HandleLogin(values) {
  try {
    await AuthApi.login(values.states.email.value, values.states.password.value);
        toast.add({
        severity: 'success',
        summary: 'Login successful',
        detail: 'You have been logged in',
        life: 3000,
    });
        router.push('/home');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Login failed',
      detail: err.message,
      life: 3000,
    });
  }
}
</script>
