import { apiFetch } from "./apiClient";

export function getBoathalls() {
  return apiFetch(`/boathalls`);
}

export function getBoathall(id) {
  return apiFetch(`/boathalls/${id}`);
}

export function createBoathall(payload) {
  return apiFetch(`/boathalls`, {
    method: "POST",
    body: payload
  });
}

export function updateBoathall(id, payload) {
  return apiFetch(`/boathalls/${id}`, {
    method: "PUT",
    body: payload
  });
}

export function deleteBoathall(id) {
  return apiFetch(`/boathalls/${id}`, { method: "DELETE" });
}
