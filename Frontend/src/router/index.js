import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";

const routes = [
    {
        path: "/",
        redirect: "/login",
    },
    {

        path: "/login",
        name: "Login",
        component: LoginView,
    },
    {
        path: "/home",
        name: "Home",
        component: '',
        meta: { requiresAuth: true },
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !document.cookie.includes("token")) {
        if (token) {
            next();
        } else {
            next("/login");
        }
    } else {
        next();
    }
});

export default router;