// services/boatService.js
import { apiFetch } from "./apiClient";

export async function createBoat(data) {
  return await apiFetch("/boat", {
    method: "POST",
    body: data
  });
}

export async function getBoats() {
  return await apiFetch("/boat");
}

export async function getBoat(id) {
  return await apiFetch(`/boat/${id}`);
}

export async function updateBoat(id, data) {
  return await apiFetch(`/boat/${id}`, {
    method: "PUT",
    body: data
  });
}

export async function deleteBoat(id) {
  return await apiFetch(`/boat/${id}`, { method: "DELETE" });
}

export async function getBoatByQR(qrCode) {
  return await apiFetch(`/boat/byqr/${qrCode}`);
}
