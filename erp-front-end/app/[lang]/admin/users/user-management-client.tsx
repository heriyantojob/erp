"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getClientDictionary, normalizeLocale } from "@/lib/i18n/client";
import { usersApi } from "@/lib/api/erp/users.api";

type Role = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
};
type User = {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  createdAt: string;
  roles: Pick<Role, "code" | "name">[];
};
type FormState = {
  name: string;
  email: string;
  password: string;
  banned: boolean;
  roleCodes: string[];
};
const empty: FormState = {
  name: "",
  email: "",
  password: "",
  banned: false,
  roleCodes: [],
};

export default function UserManagementClient() {
  const pathname = usePathname();
  const dictionary = getClientDictionary(
    normalizeLocale(pathname.split("/")[1] || "en"),
  );
  const t = dictionary.users;
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function reload() {
    const [userData, roleData] = await Promise.all([
      usersApi.list(),
      usersApi.roles(),
    ]);
    setUsers(userData);
    setRoles(roleData);
  }
  useEffect(() => {
    reload()
      .catch((cause: Error) => setError(cause.message || t.loadFailed))
      .finally(() => setLoading(false));
  }, []);
  function reset() {
    setEditing(null);
    setForm(empty);
    setError("");
  }
  function edit(user: User) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      banned: user.banned,
      roleCodes: user.roles.map((role) => role.code),
    });
    setError("");
    setSuccess("");
  }
  function toggleRole(code: string) {
    setForm((current) => ({
      ...current,
      roleCodes: current.roleCodes.includes(code)
        ? current.roleCodes.filter((item) => item !== code)
        : [...current.roleCodes, code],
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.roleCodes.length) return setError(t.atLeastOneRole);
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const wasEditing = Boolean(editing);
      const payload = editing
        ? {
            name: form.name,
            email: form.email,
            banned: form.banned,
            roleCodes: form.roleCodes,
          }
        : form;
      if (editing) await usersApi.update(editing.id, payload);
      else await usersApi.create(payload);
      setEditing(null);
      setForm(empty);
      setSuccess(wasEditing ? t.updateSuccess : t.createSuccess);
      try {
        await reload();
      } catch (refreshError) {
        console.error(
          "Failed to refresh users after successful save",
          refreshError,
        );
        setError(t.refreshFailed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }
  async function remove(user: User) {
    if (!window.confirm(t.deleteConfirm)) return;
    setError("");
    setSuccess("");
    try {
      await usersApi.remove(user.id, { reason: t.deleteReason });
      if (editing?.id === user.id) {
        setEditing(null);
        setForm(empty);
      }
      setSuccess(t.deleteSuccess);
      try {
        await reload();
      } catch (refreshError) {
        console.error(
          "Failed to refresh users after successful delete",
          refreshError,
        );
        setError(t.refreshFailed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.deleteFailed);
    }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form
        onSubmit={submit}
        className="h-fit rounded-xl bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{editing ? t.editUser : t.addUser}</h2>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-emerald-700"
            >
              {t.cancel}
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium">
            {t.name}
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            {t.email}
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          {!editing && (
            <label className="text-sm font-medium">
              {t.password}
              <input
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {t.passwordHint}
              </span>
            </label>
          )}
          <fieldset>
            <legend className="text-sm font-medium">{t.roles}</legend>
            <div className="mt-2 grid gap-2">
              {roles.map((role) => (
                <label
                  key={role.code}
                  className="flex items-start gap-2 rounded border border-slate-200 p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.roleCodes.includes(role.code)}
                    onChange={() => toggleRole(role.code)}
                    className="mt-1"
                  />
                  <span>
                    <strong>{role.name}</strong>
                    {role.description && (
                      <small className="block text-slate-500">
                        {role.description}
                      </small>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {editing && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.banned}
                onChange={(e) => setForm({ ...form, banned: e.target.checked })}
              />
              {t.disabled}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        )}
        <button
          disabled={saving}
          className="mt-5 w-full rounded bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? t.saving : t.save}
        </button>
      </form>
      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold">{t.title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">{t.name}</th>
                <th className="px-4 py-3">{t.email}</th>
                <th className="px-4 py-3">{t.roles}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3">{t.createdAt}</th>
                <th className="px-4 py-3">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    {dictionary.common.loading}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {t.noUsers}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.roles.map((role) => role.name).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${user.banned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {user.banned ? t.disabled : t.active}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => edit(user)}
                        className="mr-3 text-emerald-700"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => void remove(user)}
                        className="text-red-600"
                      >
                        {t.delete}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
