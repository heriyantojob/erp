/**
 * PostgreSQL numeric(…, 3) values are returned as strings such as "1.000".
 * Present them using the active application's locale while retaining up to
 * three decimal places used by ERP quantities.
 */
type AppLocale = "id" | "en" | "ko";

const numberLocales: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-US",
  ko: "ko-KR",
};

export function formatQuantity(
  value: unknown,
  language: AppLocale = "en",
): string {
  if (value === null || value === undefined || value === "") return "-";
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return text;
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return new Intl.NumberFormat(numberLocales[language], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(number);
}

export function isQuantityField(field: string): boolean {
  return /^(quantity|requiredQuantity|plannedQuantity|quantityOnHand|reservedQuantity|availableQuantity|quantityIn|quantityOut)$/.test(
    field,
  );
}
