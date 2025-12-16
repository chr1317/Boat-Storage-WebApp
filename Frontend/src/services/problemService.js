import { apiFetch } from "./apiClient";

export function getProblems(options = {}) {
  const params = new URLSearchParams();

  if (options.AID) params.set("AID", options.AID);
  if (options.BID) params.set("BID", options.BID);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/problems${query}`);
}

export function getProblemsByStorage(AID) {
  return getProblems({ AID });
}

export function getProblemsByBoat(BID) {
  return getProblems({ BID });
}

export function getProblemById(id) {
  return apiFetch(`/problems/${id}`);
}
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

export function createProblem(payload, autoWork = false) {
  if (!payload.AID) {
    console.warn(
      "[problemService] createProblem: brak AID – zalecane createProblemForStorage(AID, payload)"
    );
  }
  return createProblemForStorage(payload.AID, payload, autoWork);
}

export function createWorkFromProblem(id, payload) {
  return apiFetch(`/problems/${id}/work`, {
    method: "POST",
    body: payload,
  });
}

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
