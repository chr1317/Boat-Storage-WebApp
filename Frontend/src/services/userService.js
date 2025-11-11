import { apiFetch } from "./apiClient";

export function getUsers() {
  return apiFetch("/user");
}
export function addUser(data) {
  return apiFetch("/user", { method: "POST", body: data });
}
export function updateUser(id, data) {
  return apiFetch(`/user/${id}`, { method: "PUT", body: data });
}
export function deleteUser(id) {
  return apiFetch(`/user/${id}`, { method: "DELETE" });
}
export function resetUserPassword(id, newPassword) {
  return apiFetch(`/user/${id}/reset-password`, {
    method: "PUT",
    body: { newPassword },
  });
}
