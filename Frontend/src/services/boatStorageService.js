// Frontend/src/services/boatStorageService.js
import { apiFetch } from "./apiClient";


export function createBoatStorage(payload) {
  return apiFetch("/boatStorage", {
    method: "POST",
    body: payload,
  });
}
/**
 * Pobranie rekordu BoatStorage po AID
 * używane na ekranie BoatStorageDetail
 */
export function getBoatStorageById(AID) {
  return apiFetch(`/boatStorage/${AID}`);
}

export function getAllBoatStorage() {
  return apiFetch("/boatStorage");
}

export function getLightBoatStorage() {
  return apiFetch("/boatStorage/light");
}

/**
 * Lista wszystkich przechowywań dla danej łodzi (historia sezonów)
 * używane na BoatDetailsView (dla BID)
 */
export function getBoatStorageByBoat(BID) {
  return apiFetch(`/boatStorage/byBoat/${BID}`);
}

/**
 * Aktualne przechowywanie dla łodzi (do QR i przycisku „aktualny sezon”)
 */
export function getActiveBoatStorage(BID) {
  return apiFetch(`/boatStorage/active/${BID}`);
}

export function updateBoatStorage(AID, payload) {
  return apiFetch(`/boatStorage/${AID}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteBoatStorage(AID) {
  return apiFetch(`/boatStorage/${AID}`, { method: "DELETE" });
}
