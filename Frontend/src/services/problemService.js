// Frontend/src/services/problemService.js
import { apiFetch } from "./apiClient";

// ==========================
// LISTA PROBLEMÓW
// ==========================

/**
 * Lista problemów
 * options:
 *  - AID: problemy dla konkretnego przechowywania (BoatStorage)
 *  - BID: problemy dla łodzi (historia)
 */
export function getProblems(options = {}) {
  const params = new URLSearchParams();

  if (options.AID) params.set("AID", options.AID);
  if (options.BID) params.set("BID", options.BID);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/problems${query}`);
}

/** Problemy dla konkretnego przechowywania (AID) */
export function getProblemsByStorage(AID) {
  return getProblems({ AID });
}

/** Problemy dla łodzi (historia po BID) */
export function getProblemsByBoat(BID) {
  return getProblems({ BID });
}

// ==========================
// POJEDYNCZY PROBLEM
// ==========================

export function getProblemById(id) {
  return apiFetch(`/problems/${id}`);
}

// ==========================
// TWORZENIE
// ==========================

/**
 * Tworzenie problemu dla konkretnego AID (BoatStorage)
 * payload np:
 *  { Description, Type?, SID?, Date?, HR?, Comment?, UID? }
 * autoWork = true → staff automatycznie tworzy Work
 */
export function createProblemForStorage(AID, payload, autoWork = false) {
  const query = autoWork ? "?autoWork=true" : "";
  return apiFetch(`/problems${query}`, {
    method: "POST",
    body: {
      ...payload,
      AID,
    },
  });
}

/**
 * Legacy: createProblem(payload, autoWork)
 *  – po refaktorze payload MUSI zawierać AID
 */
export function createProblem(payload, autoWork = false) {
  if (!payload.AID) {
    console.warn(
      "[problemService] createProblem: brak AID – zalecane createProblemForStorage(AID, payload)"
    );
  }
  return createProblemForStorage(payload.AID, payload, autoWork);
}

// ==========================
// PRACA Z PROBLEMU
// ==========================

export function createWorkFromProblem(id, payload) {
  return apiFetch(`/problems/${id}/work`, {
    method: "POST",
    body: payload,
  });
}

// ==========================
// UPDATE / STATUS / DELETE
// ==========================

export function updateProblemStatus(id, status) {
  return apiFetch(`/problems/${id}/status`, {
    method: "PUT",
    body: { Status: status },
  });
}

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

// Akceptacja problemu typu Issue przez klienta
export function approveProblem(id) {
  return apiFetch(`/problems/${id}/approve`, {
    method: "PUT",
  });
}
