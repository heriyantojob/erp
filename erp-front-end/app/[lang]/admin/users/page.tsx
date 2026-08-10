import { getDictionary } from "@/get-dictionary";
import { normalizeLocale } from "@/lib/i18n/client";
import AdminShell from "../_components/AdminShell";
import UserManagementClient from "./user-management-client";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(normalizeLocale(lang));
  return (
    <AdminShell title={dictionary.users.title}>
      <UserManagementClient />
    </AdminShell>
  );
}
