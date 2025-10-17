import { defineStore } from "pinia";
import { login, logout, getMe } from "../services/auth";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    initialized: false,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    role: (state) => state.user?.Role ?? null,
  },

  actions: {
    async fetchMe() {
      this.loading = true;
      try {
        const me = await getMe();
        this.user = me;
        return me;
      } catch (err) {
        console.error("fetchMe error:", err);
        this.user = null;
        return null;
      } finally {
        this.loading = false;
        this.initialized = true;
      }
    },

    async login({ Email, Password }) {
      try {
        await login(Email, Password);
        await this.fetchMe();
      } catch (err) {
        console.error("login error:", err);
        throw err;
      }
    },

    async logout() {
      try {
        await logout();
      } catch (err) {
        console.error("logout error:", err);
      } finally {
        this.user = null;
        this.initialized = true;
      }
    },
  },
});
