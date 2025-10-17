import { createI18n } from "vue-i18n";
import en from "./en.json";
import sv from "./sv.json";

const savedLang = localStorage.getItem("lang") || "en";

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: "en",
  messages: { en, sv }
});

export default i18n;