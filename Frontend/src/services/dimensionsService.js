import { apiFetch } from "./apiClient";

export function getDimensions(bid) {
  return apiFetch(`/BoatDimensions/${bid}`);
}


export function createDimensions(payload) {
  return apiFetch(`/BoatDimensions`, {
    method: "POST",
    body: payload,
  });
}

export function updateDimensions(bid, payload) {
  return apiFetch(`/BoatDimensions/${bid}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteDimensions(bid) {
  return apiFetch(`/BoatDimensions/${bid}`, {
    method: "DELETE",
  });
}
