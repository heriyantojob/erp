import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";
import AdminShell from "./_components/AdminShell";
export default async function AdminDashboard({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; const d = await getDictionary(normalizeLocale(lang)); return <AdminShell title={d.dashboard.title}><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{d.dashboard.cards.map((card) => <article key={card.title} className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-semibold">{card.title}</h2><p className="mt-2 text-sm text-slate-600">{card.description}</p></article>)}</section></AdminShell>; }
