import { apiFetch } from "./apiClient";

export function getBoatById(id) {
  return apiFetch(`/boat/${id}`);
}

export function getBoatByQR(qr) {
  return apiFetch(`/boat/byqr/${qr}`);
}

export function getAllBoats() {
    return apiFetch(`/boat`);
}