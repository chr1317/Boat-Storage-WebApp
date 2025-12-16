import { apiFetch } from "./apiClient";

export function getWorks(boatId = null) {
  if (boatId) return apiFetch(`/work/boat/${boatId}`);
  return apiFetch(`/work`);
}

export function getAllWorks() {
  return apiFetch(`/work`);
}

export function getEmployeeWorks() {
  return apiFetch(`/work/employee`);
}

export function getWorkByBoat(BID, AID = null) {
  let url = `/work/boat/${BID}`;
  if (AID) url += `?AID=${AID}`;
  return apiFetch(url);
}

export function getWorkByStorage(AID) {
  return apiFetch(`/work/storage/${AID}`);
}

export function getWorkById(workId) {
  return apiFetch(`/work/${workId}`);
}

export function getFullServiceHistory(BID) {
  return apiFetch(`/work/history/boat/${BID}`);
}

export function createWorkForStorage(AID, payload) {
  return apiFetch(`/work`, {
    method: "POST",
    body: {
      ...payload,
      AID,
    },
  });
}

export function createWork(payload) {
  if (!payload.AID) {
    console.warn(
      "[workService] createWork: brak AID – użyj createWorkForStorage(AID, payload)"
    );
  }
  return createWorkForStorage(payload.AID, payload);
}

export function updateWork(workId, payload) {
  return apiFetch(`/work/${workId}`, {
    method: "PUT",
    body: payload,
  });
}

export function updateWorkState(workId, newState) {
  return apiFetch(`/work/${workId}/state`, {
    method: "PUT",
    body: { State: newState },
  });
}

export function deleteWork(workId) {
  return apiFetch(`/work/${workId}`, {
    method: "DELETE",
  });
}
