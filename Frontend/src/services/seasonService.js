import { apiFetch } from "./apiClient";

/**
 * Get all defined seasons
 */
export function getSeasons() {
  return apiFetch(`/seasons`);
}

/**
 * Get single season by seasonID
 */
export function getSeasonById(id) {
  return apiFetch(`/seasons/${id}`);
}

export function createSeason(data) {
  return apiFetch(`/seasons`, { method: "POST", body: data });
}

export function updateSeason(id, data) {
  return apiFetch(`/seasons/${id}`, { method: "PUT", body: data });
}

export function deleteSeason(id) {
  return apiFetch(`/seasons/${id}`, { method: "DELETE" });
}