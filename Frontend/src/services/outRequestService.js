// Frontend/src/services/outRequestService.js
import { apiFetch } from "./apiClient";

/**
 * Tworzenie prośby o wyjście łodzi (Client)
 * Teraz wymagamy AID – konkretnego przechowywania.
 *
 * payload:
 *  {
 *    AID,
 *    type: "Launch" | "Trailer",
 *    preferredWeekStart: "YYYY-MM-DD",
 *    preferredWeekEnd:   "YYYY-MM-DD",
 *    comment?: string
 *  }
 */
export function createOutRequest(payload) {
  if (!payload.AID) {
    console.warn(
      "[outRequestService] createOutRequest: brak AID – wymagane po refaktorze backendu"
    );
  }

  return apiFetch("/outRequests", {
    method: "POST",
    body: payload,
  });
}

// Klient – swoje prośby (opcjonalnie z filtrem po AID)
export function getMyOutRequests(AID = null) {
  let url = "/outRequests/my";
  if (AID) {
    const params = new URLSearchParams();
    params.set("AID", AID);
    url += `?${params.toString()}`;
  }
  return apiFetch(url);
}

// Admin/Employee – wszystkie (opcjonalny status, AID)
export function getAllOutRequests({ status, AID } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (AID) params.set("AID", AID);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/outRequests${query}`);
}

// Akceptacja prośby (staff)
export function approveOutRequest(id, confirmedDate = null) {
  return apiFetch(`/outRequests/${id}/approve`, {
    method: "PUT",
    body: confirmedDate ? { confirmedDate } : {},
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
