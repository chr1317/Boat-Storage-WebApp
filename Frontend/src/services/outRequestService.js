// Frontend/src/services/outRequestService.js
import { apiFetch } from "./apiClient";

export function createOutRequest(payload) {
  return apiFetch("/outRequests", {
    method: "POST",
    body: payload,
  });
}

// Klient – swoje prośby
export function getMyOutRequests() {
  return apiFetch("/outRequests/my");
}

// Admin/Employee – wszystkie (opcjonalny status)
export function getAllOutRequests(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/outRequests${query}`);
}

export function approveOutRequest(id, confirmedDate) {
  return apiFetch(`/outRequests/${id}/approve`, {
    method: "PUT",
    body: { confirmedDate },
  });
}

export function rejectOutRequest(id, reason) {
  return apiFetch(`/outRequests/${id}/reject`, {
    method: "PUT",
    body: { reason },
  });
}

export function cancelOutRequest(id) {
  return apiFetch(`/outRequests/${id}/cancel`, {
    method: "PUT",
  });
}
