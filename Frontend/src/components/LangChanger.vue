<template>
    <img
        :src="getLangFlag(locale)"
        alt="Language"
        class="w-8 h-8 cursor-pointer hover:scale-105 transition-transform duration-200"
        @click="cycleLang"
    />
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { locale } = useI18n({ useScope: "global" }); 

function cycleLang() {
  const langs = ["en", "sv"];
  const current = langs.indexOf(locale.value);
  const next = langs[(current + 1) % langs.length];
  setLang(next);
}

function setLang(lang) {
  locale.value = lang;
  localStorage.setItem("lang", lang);
}

function getLangFlag(lang) {
  switch (lang) {
    case "sv":
      return new URL("../assets/se.svg", import.meta.url).href;
    default:
      return new URL("../assets/gb.svg", import.meta.url).href;
  }
}
</script>