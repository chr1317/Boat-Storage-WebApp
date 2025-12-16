import { apiFetch } from "./apiClient";

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { Email: email, Password: password },
  });
}

export async function logout() {
  return apiFetch("/auth/logout", {
    method: "POST",
  });
}

export async function getMe() {
  try {
    return await apiFetch("/auth/me");
  } catch (err) {
    if (err.message.includes("401")) return null;
    throw err;
  }
}
