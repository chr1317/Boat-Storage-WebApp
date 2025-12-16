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
const BoatRedirectByQR = () => import("../components/Boat/BoatRedirectByQR.vue");
const UserListView = () => import("../views/UserListView.vue");
const SetPasswordView = () => import("../views/SetPasswordView.vue");
const outRequestsView = () => import("../views/OutRequestView.vue");
const HallMapView = () => import("../views/HallMapView.vue");
const ProblemListView = () => import("../views/ProblemListView.vue");
const WorkListView = () => import("../views/WorkListView.vue");
const BoatHallsView = () => import("../views/BoatHallsView.vue");
const BoatStorageDetailsView = () => import("../views/BoatStorageDetailsView.vue");
const BoatActiveStorageListView = () => import("../views/BoatActiveStorageListView.vue");
const BoatServiceHistoryView = () => import("../views/BoatServiceHistoryView.vue");
const SeasonsListView = () => import("../views/SeasonsListView.vue");

const routes = [
  { path: "/", redirect: "/home" },

  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },

  {
    path: "/qr/:qr",
    name: "BoatRedirectByQR.vie",
    component: BoatRedirectByQR,
  },
  {
    path: "/set-password",
    name: "SetPassword",
    component: SetPasswordView,
  }, 

  // <-- Layout
  {
  path: "/home",
  component: HomeView,
  meta: { requiresAuth: true },
  children: [
    {
      path: "boats",
      name: "Boats",
      component: BoatListView,
      meta: { title: "Boats" },
    },
    {
      path: "boats/:id",
      name: "BoatDetails",
      component: BoatDetailsView,
      meta: { title: "Boat Details" },
    },
    {
      path: "storage",
      name: "BoatStorage",
      component: BoatActiveStorageListView,
      meta: { title: "Boat Storage" },
    },
    {
      path: "storage/:AID",
      name: "BoatStorageDetail",
      component: BoatStorageDetailsView,
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "services",
      name: "Services",
      component: ServicesListView,
      meta: { title: "Services" },
    },
    {
      path: "dashboard",
      name: "Dashboard",
      component: DashboardView,
      meta: { title: "Dashboard" },
    },
    {
      path: "users",
      name: "Users",
      component: UserListView,
      meta: { title: "Users" },
    },
    {
      path: "out-requests",
      name: "OutRequests",
      component: outRequestsView,
      meta: { roles: ["Admin","Employee"] }
    },
    {
      path: "halls/:id",
      name: "HallMap",
      component: HallMapView,
      meta: { title: "Hall map", roles: ["Admin", "Employee"] },
    },
    {
      path: "problems",
      name: "Problems",
      component: ProblemListView,
      meta: { title: "Problems", roles: ["Admin", "Employee"] },
    },
    {
      path: "works",
      name: "Works",
      component: WorkListView,
      meta: { title: "Works", roles: ["Admin", "Employee"] },
    },
    {
      path: "boat-halls",
      name: "BoatHalls",
      component: BoatHallsView,
      meta: { title: "BoatHalls", roles: ["Admin", "Employee"] },
    },
    {
      path: "boat/:id/history",
      name: "BoatHistory",
      component: BoatServiceHistoryView,
      meta: { title: "Boat History", roles: ["Admin", "Employee"] },
    },
    {
      path: "seasons",
      name: "Seasons",
      component: SeasonsListView,
      meta: { title: "Seasons", roles: ["Admin", "Employee"] },
    }
  ],
}

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
