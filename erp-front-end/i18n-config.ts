export const i18n = {
  defaultLocale: "id",
  locales: ["en", "ko", "id"],
} as const;

export type Locale = (typeof i18n.locales)[number];
export function isLocale(value: string): value is Locale {
  return i18n.locales.includes(value as Locale);
}
