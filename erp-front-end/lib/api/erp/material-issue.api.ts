import { erpRequest } from "@/lib/api/erp-client";
export const materialIssueApi = {
  create: (body: unknown) =>
    erpRequest<any>("stock/material-issues", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
