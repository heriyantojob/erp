import "./globals.css";
import { notFound } from "next/navigation";
import { getDictionary } from "@/get-dictionary";
import { i18n, isLocale, type Locale } from "@/i18n-config";
import LocaleSwitcher from "./components/locale-switcher";

export function generateStaticParams() {
  return i18n.locales.map((lang) => ({ lang }));
}

export const metadata = {
  title: "ERP File Manager",
  description: "ERP inventory and file management application",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  if (!isLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const dictionary = await getDictionary(lang);

  return (
    <html lang={lang}>
      <body>
        <div className="fixed right-4 top-4 z-[100]">
          <LocaleSwitcher
            currentLocale={lang}
            label={dictionary.common.language}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
