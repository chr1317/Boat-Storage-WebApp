import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

// layout (z TopPanel + SidePanel + <router-view/>)
import HomeView from "../views/HomeView.vue";

// widoki – wszystko na ścieżkach względnych
const LoginView = () => import("../views/LoginView.vue");
const BoatListView = () => import("../views/BoatListView.vue");
const BoatDetailsView = () => import("../views/BoatDetailsView.vue");
const ServicesListView = () => import("../views/ServicesListView.vue");
const DashboardView = () => import("../views/DashboardView.vue");

const routes = [
  { path: "/", redirect: "/home" },

  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },

  // <-- Layout
  {
    path: "/home",
    component: HomeView,
    meta: { requiresAuth: true },
    children: [
      {
        path: "/boats",
        name: "Boats",
        component: BoatListView,
        meta: { title: "Boats" },
      },
      {
        path: "/boats/:id",
        name: "BoatDetails",
        component: BoatDetailsView,
        meta: { title: "Boat Details" },
      },
      {
        path: "/services",
        name: "Services",
        component: ServicesListView,
        meta: { title: "Services" },
      },
      {
        path: "/dashboard",
        name: "Dashboard",
        component: DashboardView,
        meta: { title: "Dashboard" },
      },
      // {
      //   path: "settings",
      //   name: "Settings",
      //   component: SettingsView,
      //   meta: { title: "Settings" },
      // },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

async function ensureAuth(store) {
  if (!store.initialized) await store.fetchMe();
  return store.isAuthenticated;
}

router.beforeEach(async (to, _from, next) => {
  const store = useAuthStore();

  if (to.path === "/login" && (await ensureAuth(store))) {
    return next("/home");
  }

  if (!to.meta.requiresAuth) return next();

  const ok = await ensureAuth(store);
  if (!ok) return next("/login");

  if (to.meta.roles && !to.meta.roles.includes(store.role)) {
    return next("/unauthorized");
  }

  next();
});

export default router;
