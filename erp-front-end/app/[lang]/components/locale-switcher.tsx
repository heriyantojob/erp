"use client";

import { usePathname, useRouter } from "next/navigation";
import { i18n, type Locale } from "@/i18n-config";

type Props = {
  currentLocale: Locale;
  label: string;
};

const localeNames: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  id: "Indonesia",
};

export default function LocaleSwitcher({ currentLocale, label }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    router.push(segments.join("/") || `/${nextLocale}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={currentLocale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
      >
        {i18n.locales.map((locale) => (
          <option key={locale} value={locale}>{localeNames[locale]}</option>
        ))}
      </select>
    </label>
  );
}
