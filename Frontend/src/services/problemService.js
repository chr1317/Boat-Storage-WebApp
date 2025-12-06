import { apiFetch } from "./apiClient";

// Lista wszystkich problemów (admin / employee), lub problemów klienta
export function getProblems() {
  return apiFetch(`/problems`);
}

// Pobranie jednego problemu
export function getProblemById(id) {
  return apiFetch(`/problems/${id}`);
}

// Tworzenie problemu
export function createProblem(payload, autoWork = false) {
  const query = autoWork ? "?autoWork=true" : "";
  return apiFetch(`/problems${query}`, {
    method: "POST",
    body: payload,
  });
}

// Utworzenie pracy z problemu (tylko staff)
export function createWorkFromProblem(id, payload) {
  return apiFetch(`/problems/${id}/work`, {
    method: "POST",
    body: payload,
  });
}

// Aktualizacja statusu (staff)
export function updateProblemStatus(id, status) {
  return apiFetch(`/problems/${id}/status`, {
    method: "PUT",
    body: { Status: status },
  });
}

// Edycja problemu (staff: type + description, client: tylko description)
export function updateProblem(id, payload) {
  return apiFetch(`/problems/${id}`, {
    method: "PUT",
    body: payload,
  });
}

// Usunięcie problemu (staff)
export function deleteProblemById(id) {
  return apiFetch(`/problems/${id}`, {
    method: "DELETE",
  });
}

export function approveProblem(id) {
  return apiFetch(`/problems/${id}/approve`, {
    method: "PUT",
  });
}