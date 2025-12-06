import { apiFetch } from "./apiClient";

// Lista wszystkich prac (opcjonalnie z filtrem po łodzi)
export function getWorks(boatId = null) {
  if (boatId) return apiFetch(`/work/boat/${boatId}`);
  return apiFetch(`/work`);
}

// Aktualizacja stanu pracy
export function updateWorkState(workId, newState) {
  return apiFetch(`/work/${workId}/state`, {
    method: "PUT",
    body: { State: newState },
  });
}

// Usunięcie pracy
export function deleteWork(workId) {
  return apiFetch(`/work/${workId}`, { method: "DELETE" });
}

// (opcjonalnie) tworzenie pracy
export function createWork(payload) {
  return apiFetch(`/work`, {
    method: "POST",
    body: payload,
  });
}

export function updateWork(workId, payload) {
  return apiFetch(`/work/${workId}`, {
    method: "PUT",
    body: payload,
  });
}

// Works assigned to current logged-in employee
export function getEmployeeWorks() {
  return apiFetch(`/work/employee`);
}

export function getAllWorks() {
  return apiFetch(`/work`);
}
