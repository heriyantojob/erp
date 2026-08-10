import AdminShell from "../_components/AdminShell";
import StockPrototypeClient from "../_components/StockPrototypeClient";
import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const d = await getDictionary(normalizeLocale(lang));
  return (
    <AdminShell title={d.processAnalysis.stages.finishedGoodsWarehouse.title}>
      <StockPrototypeClient screen="current-stock" warehouseCode="FG" />
    </AdminShell>
  );
}
