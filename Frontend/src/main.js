import { createApp } from 'vue'
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import './style.css'
import "primeicons/primeicons.css";
import App from './App.vue'
import router from './router/index.js';
import Aura from '@primeuix/themes/aura';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import i18n from './I18n-Language/index.js';

const app = createApp(App)
const pinia = createPinia();

app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.my-app-dark',
            cssLayer: {
                name: 'primevue',
                order: 'theme, base, primevue'
            }
        }
    }
 });
app.use(ToastService);
app.use(i18n);
app.use(pinia);
app.mount('#app');
