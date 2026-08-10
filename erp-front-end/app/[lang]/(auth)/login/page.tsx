import { getDictionary } from "@/get-dictionary";
import type { Locale } from "@/i18n-config";
import LoginForm from "./components/login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <LoginForm lang={lang} dictionary={dictionary.auth} />;
}
