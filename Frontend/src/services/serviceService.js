import { apiFetch } from "./apiClient";

export function getServices() {
  return apiFetch(`/services`);
}

export function createService(payload) {
  return apiFetch(`/services`, {
    method: "POST",
    body: payload,
  });
}

export function updateService(serviceId, payload) {
  return apiFetch(`/services/${serviceId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteServiceById(serviceId) {
  return apiFetch(`/services/${serviceId}`, { 
    method: "DELETE" 
  });
}
