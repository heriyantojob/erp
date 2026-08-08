"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { signOut, useSession } from "@/lib/better-auth/auth-client";
import { getClientDictionary, normalizeLocale } from "@/lib/i18n/client";

type NavKey = keyof ReturnType<typeof getClientDictionary>["admin"]["nav"];
type NavItem = readonly [NavKey, string];

const overviewItems: readonly NavItem[] = [
  ["dashboard", ""],
  ["analysis", "/process-analysis"],
];

const processItems: readonly NavItem[] = [
  ["purchaseRequisition", "/purchase-requisition"],
  ["purchaseOrder", "/purchase-order"],
  ["receiptInput", "/goods-receipt-input"],
  ["incomingQuality", "/incoming-quality"],
  ["rawMaterialWarehouse", "/raw-material-warehouse"],
  ["issues", "/material-issues"],
  ["productionOrder", "/production-order"],
  ["manufacturing", "/manufacturing"],
  ["finishedGoodsReceipt", "/finished-goods-receipt"],
  ["finishedGoodsWarehouse", "/finished-goods-warehouse"],
  ["salesOrder", "/sales-order"],
  ["customerDelivery", "/customer-delivery"],
];

const controlItems: readonly NavItem[] = [
  ["availability", "/stock-availability"],
  ["currentStock", "/current-stock"],
  ["ledger", "/stock-ledger"],
];

const masterItems: readonly NavItem[] = [
  ["materials", "/materials"],
  ["partners", "/business-partners"],
  ["bom", "/bill-of-materials"],
];

const processFlow = processItems;

type GroupName = "overview" | "process" | "controls" | "masterData";

export default function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lang = normalizeLocale(pathname.split("/")[1] || "id");
  const dictionary = getClientDictionary(lang);
  const base = `/${lang}/admin`;
  const activeProcessIndex = processFlow.findIndex(([, suffix]) => pathname === `${base}${suffix}`);
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const belongsTo = (items: readonly NavItem[]) => items.some(([, suffix]) => pathname === `${base}${suffix}`);
  const [openGroups, setOpenGroups] = useState<Record<GroupName, boolean>>({
    overview: belongsTo(overviewItems),
    process: belongsTo(processItems) || activeProcessIndex >= 0,
    controls: belongsTo(controlItems),
    masterData: belongsTo(masterItems),
  });

  if (isPending) return <main className="grid min-h-screen place-items-center">{dictionary.common.loading}</main>;
  if (!session?.user) {
    return (
      <main className="grid min-h-screen place-items-center gap-4">
        <p>{dictionary.admin.loginPrompt}</p>
        <Link className="rounded-lg bg-slate-950 px-4 py-2 text-white" href={`/${lang}/login`}>
          {dictionary.common.login}
        </Link>
      </main>
    );
  }

  const navLink = ([key, suffix]: NavItem, closeAfterNavigate = false) => {
    const href = `${base}${suffix}`;
    const selected = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => closeAfterNavigate && setMobileMenuOpen(false)}
        className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
          selected ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        {dictionary.admin.nav[key]}
      </Link>
    );
  };

  const group = (name: GroupName, items: readonly NavItem[], closeAfterNavigate = false) => {
    const open = openGroups[name];
    const selected = belongsTo(items);
    return (
      <section className="border-t border-slate-800 pt-2 first:border-t-0" key={name}>
        <button
          type="button"
          onClick={() => setOpenGroups((current) => ({ ...current, [name]: !current[name] }))}
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] transition ${
            selected ? "text-emerald-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <span>{dictionary.admin.sections[name]}</span>
          <span className={`text-base transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </button>
        {open && <div className="mt-1 grid gap-1 pl-1">{items.map((item) => navLink(item, closeAfterNavigate))}</div>}
      </section>
    );
  };

  const navigation = (closeAfterNavigate = false) => (
    <nav className="mt-5 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
      <div className="pb-2">
        {navLink(["users", "/users"], closeAfterNavigate)}
      </div>
      {group("overview", overviewItems, closeAfterNavigate)}
      {group("process", processItems, closeAfterNavigate)}
      {group("controls", controlItems, closeAfterNavigate)}
      {group("masterData", masterItems, closeAfterNavigate)}
    </nav>
  );

  const account = (
    <div className="mt-4 border-t border-slate-700 pt-5 text-sm">
      <p className="truncate font-medium">{session.user.name || session.user.email}</p>
      <button
        onClick={async () => {
          await signOut();
          router.push(`/${lang}/login`);
        }}
        className="mt-3 w-full rounded-lg border border-slate-600 px-3 py-2 text-left hover:bg-slate-800"
      >
        {dictionary.common.signOut}
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-slate-950 p-5 text-slate-100 md:flex">
          <div className="border-b border-slate-700 pb-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400">{dictionary.admin.brand}</p>
            <h1 className="mt-2 text-xl font-bold">{dictionary.admin.name}</h1>
          </div>
          {navigation()}
          {account}
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button aria-label={dictionary.admin.closeMenu} onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-slate-950/60" />
            <aside className="relative flex h-full w-72 flex-col bg-slate-950 p-5 text-slate-100 shadow-2xl">
              <button aria-label={dictionary.admin.closeMenu} onClick={() => setMobileMenuOpen(false)} className="ml-auto rounded border border-slate-600 px-3 py-1 text-lg">×</button>
              {navigation(true)}
              {account}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1 p-4 md:p-8">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-5">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{dictionary.admin.subtitle}</p>
            </div>
            <button aria-label={dictionary.admin.openMenu} onClick={() => setMobileMenuOpen(true)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xl md:hidden">☰</button>
          </header>

          {activeProcessIndex >= 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{dictionary.admin.sections.process}</p>
                <p className="text-xs text-slate-500">{activeProcessIndex + 1} / {processFlow.length}</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {processFlow.map(([key, suffix], index) => (
                  <Link
                    key={suffix}
                    href={`${base}${suffix}`}
                    className={`min-w-max rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      index === activeProcessIndex
                        ? "bg-emerald-700 text-white"
                        : index < activeProcessIndex
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")} · {dictionary.admin.nav[key].replace(/^\d+\s*·\s*/, "")}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
