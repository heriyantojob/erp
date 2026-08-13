/**
 * PostgreSQL numeric(…, 3) values are returned as strings such as "1.000".
 * Keep the quantity value intact, but omit insignificant trailing zeroes when
 * it is presented to users so "1" never appears to be one thousand.
 */
export function formatQuantity(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return text;
  const normalized = text.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  return normalized === "-0" ? "0" : normalized;
}

export function isQuantityField(field: string): boolean {
  return /^(quantity|requiredQuantity|plannedQuantity|quantityOnHand|reservedQuantity|availableQuantity|quantityIn|quantityOut)$/.test(
    field,
  );
}
