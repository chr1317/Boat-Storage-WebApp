import { apiFetch } from "./apiClient";

export function getEngine(bid) {
  return apiFetch(`/Engine_Information/${bid}`);
}

export function createEngine(payload) {
  return apiFetch(`/Engine_Information`, {
    method: "POST",
    body: payload,
  });
}
export function updateEngine(bid, payload) {
  return apiFetch(`/Engine_Information/${bid}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteEngine(bid) {
  return apiFetch(`/Engine_Information/${bid}`, {
    method: "DELETE",
  });
}
