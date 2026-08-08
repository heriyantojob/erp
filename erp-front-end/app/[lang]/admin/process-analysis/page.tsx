import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";

type Stage = {
  key: string;
  href?: string;
  implemented: boolean;
};

const topStages: Stage[] = [
  { key: "purchaseRequisition", href: "/admin/purchase-requisition", implemented: true },
  { key: "purchaseOrder", href: "/admin/purchase-order", implemented: true },
  { key: "goodsReceipt", href: "/admin/goods-receipt-input", implemented: true },
  { key: "incomingQuality", href: "/admin/incoming-quality", implemented: true },
  { key: "rawMaterialWarehouse", href: "/admin/raw-material-warehouse", implemented: true },
  { key: "materialIssue", href: "/admin/material-issues", implemented: true },
];
const bottomStages: Stage[] = [
  { key: "customerDelivery", href: "/admin/customer-delivery", implemented: true },
  { key: "salesDeliveryOrder", href: "/admin/sales-order", implemented: true },
  { key: "finishedGoodsWarehouse", href: "/admin/finished-goods-warehouse", implemented: true },
  { key: "finishedGoodsReceipt", href: "/admin/finished-goods-receipt", implemented: true },
  { key: "manufacturingProcess", href: "/admin/manufacturing", implemented: true },
  { key: "productionOrder", href: "/admin/production-order", implemented: true },
];

function Arrow({ direction = "right" }: { direction?: "right" | "left" | "down" }) {
  if (direction === "down") {
    return (
      <div className="hidden h-12 items-center justify-center lg:flex" aria-hidden="true">
        <div className="relative h-12 w-0.5 bg-emerald-700">
          <span className="absolute -bottom-1.5 -left-[5px] h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-emerald-700" />
        </div>
      </div>
    );
  }

  const left = direction === "left";
  return (
    <div className="hidden items-center lg:flex" aria-hidden="true">
      <div className="relative h-0.5 w-full min-w-5 bg-emerald-700">
        <span
          className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 ${
            left
              ? "-left-1 border-y-[6px] border-r-[8px] border-y-transparent border-r-emerald-700"
              : "-right-1 border-y-[6px] border-l-[8px] border-y-transparent border-l-emerald-700"
          }`}
        />
      </div>
    </div>
  );
}

function ProcessCard({
  stage,
  lang,
  dictionary,
}: {
  stage: Stage;
  lang: string;
  dictionary: any;
}) {
  const item = dictionary.processAnalysis.stages[stage.key];
  const content = (
    <div
      className={`group relative flex min-h-[94px] flex-col items-center justify-center rounded-xl border-2 px-3 py-3 text-center shadow-sm transition ${
        stage.implemented
          ? "border-emerald-700 bg-emerald-50 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md"
          : "border-emerald-500/70 bg-emerald-50/70"
      }`}
    >
      <p className="text-sm font-bold leading-tight text-slate-800">{item.title}</p>
      <p className="mt-1 text-[11px] font-medium text-emerald-700">{item.department}</p>
      <span
        className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          stage.implemented
            ? "bg-emerald-700 text-white"
            : "border border-emerald-300 bg-white text-emerald-700"
        }`}
      >
        {stage.implemented
          ? dictionary.processAnalysis.status.available
          : dictionary.processAnalysis.status.planned}
      </span>
    </div>
  );

  if (!stage.href) return content;

  return (
    <Link href={`/${lang}${stage.href}`} className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-xl">
      {content}
    </Link>
  );
}

function MobileFlow({ stages, lang, dictionary }: { stages: Stage[]; lang: string; dictionary: any }) {
  return (
    <div className="grid gap-2 lg:hidden">
      {stages.map((stage, index) => (
        <div key={stage.key}>
          <ProcessCard stage={stage} lang={lang} dictionary={dictionary} />
          {index < stages.length - 1 && (
            <div className="flex h-7 justify-center" aria-hidden="true">
              <div className="relative h-7 w-0.5 bg-emerald-700">
                <span className="absolute -bottom-1 -left-[5px] h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-emerald-700" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function ProcessAnalysisPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = normalizeLocale(lang);
  const d = await getDictionary(locale);
  const p = d.processAnalysis;
  const allStages = [...topStages, ...bottomStages.slice().reverse()];

  return (
    <AdminShell title={p.title}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{p.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-emerald-800 sm:text-3xl">{p.flowTitle}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{p.description}</p>
        </div>

        <MobileFlow stages={allStages} lang={locale} dictionary={d} />

        <div className="hidden lg:block">
          <div className="grid grid-cols-[1fr_28px_1fr_28px_1fr_28px_1fr_28px_1fr_28px_1fr] items-center">
            {topStages.map((stage, index) => (
              <div key={stage.key} className="contents">
                <ProcessCard stage={stage} lang={locale} dictionary={d} />
                {index < topStages.length - 1 && <Arrow />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6">
            <div className="col-start-6 flex justify-center"><Arrow direction="down" /></div>
          </div>

          <div className="grid grid-cols-[1fr_28px_1fr_28px_1fr_28px_1fr_28px_1fr_28px_1fr] items-center">
            {bottomStages.map((stage, index) => (
              <div key={stage.key} className="contents">
                <ProcessCard stage={stage} lang={locale} dictionary={d} />
                {index < bottomStages.length - 1 && <Arrow direction="left" />}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5">
          <span className="mr-1 text-sm font-bold text-emerald-800">{p.controlLayer}:</span>
          {p.controls.map((control: string) => (
            <span key={control} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              {control}
            </span>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-emerald-300 bg-emerald-50 p-5 sm:p-6">
          <div className="grid gap-2 md:grid-cols-[auto_1fr] md:gap-4">
            <h3 className="text-lg font-black uppercase text-emerald-800">{p.prototype.title}</h3>
            <p className="text-sm leading-6 text-slate-700">{p.prototype.description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-emerald-700" /> {p.legend.available}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border border-emerald-400 bg-emerald-50" /> {p.legend.planned}
          </span>
        </div>
      </div>
    </AdminShell>
  );
}
