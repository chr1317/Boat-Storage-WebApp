import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginView from "../views/LoginView.vue";
import HomeView from "../views/HomeView.vue";

const routes = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },
  {
    path: "/home",
    name: "Home",
    component: HomeView,
    meta: { requiresAuth: true },
  },
//   {
//     path: "/admin",
//     name: "Admin",
//     component: () => import("@/views/AdminView.vue"),
//     meta: { requiresAuth: true, roles: ["Admin"] },
//   },
//   {
//     path: "/unauthorized",
//     name: "Unauthorized",
//     component: () => import("@/views/UnauthorizedView.vue"),
//   },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

async function ensureAuth(store) {
  // Jeśli jeszcze nie sprawdzaliśmy sesji (np. po F5)
  if (!store.initialized) {
    await store.fetchMe(); // wywołuje GET /auth/me
  }
  return store.isAuthenticated;
}

router.beforeEach(async (to, from, next) => {
  const store = useAuthStore();

  // Jeśli użytkownik już zalogowany, niech nie wchodzi na /login
  if (to.path === "/login" && (await ensureAuth(store))) {
    return next("/home");
  }

  // Jeśli trasa nie wymaga autoryzacji
  if (!to.meta.requiresAuth) return next();

  // Sprawdź, czy użytkownik zalogowany
  const ok = await ensureAuth(store);
  if (!ok) return next("/login");

  // Sprawdź role (jeśli wymagane)
  if (to.meta.roles && !to.meta.roles.includes(store.role)) {
    return next("/unauthorized");
  }

  next();
});

export default router;
