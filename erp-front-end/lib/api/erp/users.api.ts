import { erpRequest } from "@/lib/api/erp-client";
export const usersApi = {
  list: () => erpRequest<any>("security/users"),
  roles: () => erpRequest<any>("security/roles"),
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
