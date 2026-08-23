import { erpRequest } from "@/lib/api/erp-client";
export const usersApi = {
  list: () => erpRequest<any>("security/users"),
  roles: () => erpRequest<any>("security/roles"),
  roleDetails: () => erpRequest<any>("security/roles/details"),
  permissions: () => erpRequest<any>("security/permissions"),
  createRole: (body: unknown) => erpRequest<any>("security/roles", { method: "POST", body: JSON.stringify(body) }),
  updateRole: (id: string, body: unknown) => erpRequest<any>(`security/roles/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) }),
  removeRole: (id: string) => erpRequest<any>(`security/roles/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createPermission: (body: unknown) => erpRequest<any>("security/permissions", { method: "POST", body: JSON.stringify(body) }),
  updatePermission: (id: string, body: unknown) => erpRequest<any>(`security/permissions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) }),
  removePermission: (id: string) => erpRequest<any>(`security/permissions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  create: (body: unknown) =>
    erpRequest<any>("security/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: unknown) =>
    erpRequest<any>(`security/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: string, body: unknown) =>
    erpRequest<any>(`security/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};
