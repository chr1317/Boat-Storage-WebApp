<template>
  <TopPanel
        class="col-span-2 z-20 rounded-2xl shadow bg-white dark:bg-surface-800" />
  <div class="flex justify-center items-center h-screen">
    
    <div class="w-full max-w-sm p-4">
      <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
      <LoginForm />
    </div>
  </div>
</template>

<script setup>
import LoginForm from '../forms/LoginForm.vue';
import LangChanger from '../components/LangChanger.vue';
import TopPanel from '../components/TopPanel.vue';
</script>