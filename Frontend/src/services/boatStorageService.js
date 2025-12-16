import { apiFetch } from "./apiClient";


export function createBoatStorage(payload) {
  return apiFetch("/boatStorage", {
    method: "POST",
    body: payload,
  });
}

export function getBoatStorageById(AID) {
  return apiFetch(`/boatStorage/${AID}`);
}

export function getAllBoatStorage() {
  return apiFetch("/boatStorage");
}

export function getLightBoatStorage() {
  return apiFetch("/boatStorage/light");
}

export function getBoatStorageByBoat(BID) {
  return apiFetch(`/boatStorage/byBoat/${BID}`);
}

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
