"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/better-auth/auth-client";
import type { Locale } from "@/i18n-config";
import type { Dictionary } from "@/get-dictionary";

export default function LoginForm({ lang, dictionary }: { lang: Locale; dictionary: Dictionary["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const result = await signIn.email({ email, password });
    setLoading(false);
    if (result.error) return setError(result.error.message || dictionary.invalidCredentials);
    router.push(`/${lang}/admin`); router.refresh();
  }

  async function signInWithGoogle() {
    setError(""); setLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: `${window.location.origin}/${lang}/admin` });
    } catch {
      setLoading(false); setError(dictionary.googleFailed);
    }
  }

  return <main className="grid min-h-screen place-items-center px-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <Link href={`/${lang}`} className="text-sm font-medium text-sky-700">← {dictionary.backHome}</Link>
      <h1 className="mt-6 text-3xl font-bold">{dictionary.title}</h1>
      <p className="mt-2 text-slate-600">{dictionary.description}</p>
      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="mt-6 block text-sm font-medium">{dictionary.email}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="mt-4 block text-sm font-medium">{dictionary.password}<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <button disabled={loading} className="mt-6 w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? dictionary.processing : dictionary.login}</button>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />{dictionary.or}<span className="h-px flex-1 bg-slate-200" /></div>
      <button type="button" disabled={loading} onClick={signInWithGoogle} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">{dictionary.google}</button>
    </form>
  </main>;
}
