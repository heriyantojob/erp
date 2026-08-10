import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";
import AdminShell from "../_components/AdminShell";
import ErpCrudClient from "../_components/ErpCrudClient";
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const d = await getDictionary(normalizeLocale(lang));
  return (
    <AdminShell title={d.modules.businessPartners}>
      <ErpCrudClient module="business-partners" />
    </AdminShell>
  );
}
