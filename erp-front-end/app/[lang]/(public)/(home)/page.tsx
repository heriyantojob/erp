import Link from "next/link";
import { getDictionary } from "@/get-dictionary";
import type { Locale } from "@/i18n-config";

export default async function LandingPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const t = dictionary.home;

  return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
    <nav className="mx-auto flex max-w-6xl items-center justify-between pr-36">
      <span className="text-lg font-bold tracking-tight">{t.brand}</span>
      <Link href={`/${lang}/login`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900">{t.login}</Link>
    </nav>
    <section className="mx-auto grid max-w-6xl gap-10 py-24 md:grid-cols-2 md:items-center">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">{t.eyebrow}</p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{t.title}</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{t.description}</p>
        <Link href={`/${lang}/login`} className="mt-8 inline-block rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-300">{t.cta}</Link>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        <p className="text-sm text-slate-400">{t.featuresTitle}</p>
        <ul className="mt-5 space-y-4 text-lg">{t.features.map((feature: string) => <li key={feature}>✓ {feature}</li>)}</ul>
      </div>
    </section>
  </main>;
}
