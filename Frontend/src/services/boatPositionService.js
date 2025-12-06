// src/services/boatPositionService.js
import { apiFetch } from "./apiClient";

export function getHallPositions(bhid) {
  return apiFetch(`/BoatPositions/hall/${bhid}`);
}

export function getBoatPosition(bid) {
  return apiFetch(`/BoatPositions/boat/${bid}`);
}

export function createBoatPosition(data) {
  return apiFetch(`/BoatPositions`, {
    method: "POST",
    body: data,
  });
}

export function updateBoatPosition(bid, data) {
  return apiFetch(`/BoatPositions/${bid}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteBoatPosition(bid) {
  return apiFetch(`/BoatPositions/${bid}`, {
    method: "DELETE",
  });
}
