// Frontend/src/services/workService.js
import { apiFetch } from "./apiClient";

// ==========================
// LISTY PRAC
// ==========================

/**
 * Lista prac:
 * - bez parametru -> wszystkie
 * - boatId       -> dla danej łodzi (historia po BID)
 */
export function getWorks(boatId = null) {
  if (boatId) return apiFetch(`/work/boat/${boatId}`);
  return apiFetch(`/work`);
}

/** Wszystkie prace (admin/employee) */
export function getAllWorks() {
  return apiFetch(`/work`);
}

/** Prace przypisane do aktualnie zalogowanego pracownika */
export function getEmployeeWorks() {
  return apiFetch(`/work/employee`);
}

/**
 * Prace dla łodzi (BID) – historia
 * (alias do getWorks, ale czytelne w kontekście historii)
 */
export function getWorkByBoat(BID, AID = null) {
  let url = `/work/boat/${BID}`;
  if (AID) url += `?AID=${AID}`;
  return apiFetch(url);
}

/**
 * Prace dla konkretnego BoatStorage (AID)
 * – główne zapytanie dla widoku BoatStorageDetail
 */
export function getWorkByStorage(AID) {
  return apiFetch(`/work/storage/${AID}`);
}
// ==========================
// POJEDYNCZA PRACA
// ==========================

export function getWorkById(workId) {
  return apiFetch(`/work/${workId}`);
}

export function getFullServiceHistory(BID) {
  return apiFetch(`/work/history/boat/${BID}`);
}

// ==========================
// TWORZENIE / UPDATE
// ==========================

/**
 * Tworzenie pracy dla konkretnego AID
 * payload:
 *  { SID, Date?, HR?, Comment, UID?, State?, parentWID? }
 */
export function createWorkForStorage(AID, payload) {
  return apiFetch(`/work`, {
    method: "POST",
    body: {
      ...payload,
      AID,
    },
  });
}

/**
 * Legacy: createWork(payload)
 * – po refaktorze payload MUSI mieć AID
 */
export function createWork(payload) {
  if (!payload.AID) {
    console.warn(
      "[workService] createWork: brak AID – użyj createWorkForStorage(AID, payload)"
    );
  }
  return createWorkForStorage(payload.AID, payload);
}

/** Aktualizacja pracy (np. komentarz, HR, przypisanie) */
export function updateWork(workId, payload) {
  return apiFetch(`/work/${workId}`, {
    method: "PUT",
    body: payload,
  });
}

/** Aktualizacja stanu pracy (ToDo / InProgress / Done) */
export function updateWorkState(workId, newState) {
  return apiFetch(`/work/${workId}/state`, {
    method: "PUT",
    body: { State: newState },
  });
}

/** Usunięcie pracy (jeśli endpoint jest w backendzie) */
export function deleteWork(workId) {
  return apiFetch(`/work/${workId}`, {
    method: "DELETE",
  });
}
