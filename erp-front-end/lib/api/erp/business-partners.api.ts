import { erpRequest } from "@/lib/api/erp-client";
export const businessPartnersApi = {
  list: (init?: RequestInit) => erpRequest<any>("business-partners", init),
  create: (body: unknown) =>
    erpRequest<any>("business-partners", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (code: string, body: unknown) =>
    erpRequest<any>(`business-partners/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (code: string, body?: unknown) =>
    erpRequest<any>(`business-partners/${encodeURIComponent(code)}`, {
      method: "DELETE",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};

export type SupplierOption = {
  value: string;
  label: string;
  code: string;
  name: string;
};

type BusinessPartnerRow = {
  code: string;
  name: string;
  type: "supplier" | "customer" | string;
  deletedAt?: string | null;
};

function normalizeSupplierOptions(
  rows: BusinessPartnerRow[],
  keyword = "",
): SupplierOption[] {
  const search = keyword.trim().toLowerCase();

  return rows
    .filter((row) => row.type === "supplier" && !row.deletedAt)
    .filter((row) => {
      if (!search) return true;
      return (
        String(row.code).toLowerCase().includes(search) ||
        String(row.name).toLowerCase().includes(search)
      );
    })
    .slice(0, 30)
    .map((supplier) => ({
      value: String(supplier.code),
      label: `${supplier.code} - ${supplier.name}`,
      code: String(supplier.code),
      name: String(supplier.name),
    }));
}

/**
 * Search supplier options for Purchase Order.
 *
 * Primary path: optimized supplier-options API.
 * Fallback path: ordinary Business Partners API and client-side filtering.
 *
 * The fallback intentionally exists because Business Partners is the source of
 * truth. Even if the optimized endpoint is unavailable/stale, a supplier that
 * is visible on the Business Partners page must still be selectable here.
 */
export async function searchSupplierOptions(
  keyword = "",
): Promise<SupplierOption[]> {
  const params = new URLSearchParams();
  if (keyword.trim()) params.set("q", keyword.trim());
  const query = params.toString();

  try {
    const options = await erpRequest<SupplierOption[]>(
      `business-partners/suppliers/options${query ? `?${query}` : ""}`,
    );

    if (Array.isArray(options) && options.length > 0) {
      return options;
    }
  } catch (error) {
    // Do not hide existing supplier master data just because the specialized
    // suggestion endpoint is unavailable. Fall back to the canonical list.
    console.warn(
      "[SupplierSelect] supplier-options endpoint failed; using Business Partners fallback",
      error,
    );
  }

  const rows = await erpRequest<BusinessPartnerRow[]>("business-partners");
  return normalizeSupplierOptions(Array.isArray(rows) ? rows : [], keyword);
}

export async function findSupplierOptionByCode(
  code: string,
): Promise<SupplierOption | null> {
  const normalized = code.trim();
  if (!normalized) return null;

  const options = await searchSupplierOptions(normalized);
  return (
    options.find(
      (option) => option.value.toLowerCase() === normalized.toLowerCase(),
    ) ?? null
  );
}
