"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getClientDictionary, normalizeLocale } from "@/lib/i18n/client";
import { materialsApi } from "@/lib/api/erp/materials.api";
import { businessPartnersApi } from "@/lib/api/erp/business-partners.api";
import { goodsReceiptsMasterApi } from "@/lib/api/erp/goods-receipts-master.api";
import { billOfMaterialsApi } from "@/lib/api/erp/bill-of-materials.api";
import { formatQuantity, isQuantityField } from "@/lib/format-quantity";
import Select, { SingleValue } from "react-select";

export type ModuleKey =
  | "materials"
  | "business-partners"
  | "goods-receipts"
  | "bill-of-materials";
type Row = Record<string, string | number | null | undefined>;
type Field = {
  key: string;
  label: string;
  type?: "date" | "number" | "select";
  options?: string[];
  readOnlyOnEdit?: boolean;
  readOnly?: boolean;
  apiSelect?: "material";
};
type Config = {
  title: string;
  idKey: string;
  fields: Field[];
  columns: string[];
  empty: Row;
};
type Material = { code: string; name: string; category: string; unit: string };
type SelectOption = { value: string; label: string; material: Material };

const configs: Record<ModuleKey, Config> = {
  materials: {
    title: "Material Master",
    idKey: "code",
    columns: ["code", "name", "category", "unit"],
    fields: [
      { key: "code", label: "Code", readOnlyOnEdit: true },
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
    ],
    empty: { code: "", name: "", category: "Raw Material", unit: "kg" },
  },
  "business-partners": {
    title: "Business Partners",
    idKey: "code",
    columns: ["type", "code", "name"],
    fields: [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["supplier", "customer"],
      },
      { key: "code", label: "Code", readOnlyOnEdit: true },
      { key: "name", label: "Name" },
    ],
    empty: { type: "supplier", code: "", name: "" },
  },
  "goods-receipts": {
    title: "Goods Receipt Transactions",
    idKey: "id",
    columns: [
      "receivedAt",
      "receiptCode",
      "materialCode",
      "batchNumber",
      "expiryDate",
      "quantity",
      "unit",
    ],
    fields: [
      { key: "receivedAt", label: "Date", type: "date" },
      { key: "receiptCode", label: "Receipt", readOnlyOnEdit: true },
      { key: "materialCode", label: "Material", apiSelect: "material" },
      { key: "batchNumber", label: "Batch" },
      { key: "expiryDate", label: "Expiry", type: "date" },
      { key: "quantity", label: "Qty", type: "number" },
      { key: "unit", label: "Unit", readOnly: true },
    ],
    empty: {
      receivedAt: new Date().toISOString().slice(0, 10),
      receiptCode: "",
      materialCode: "",
      batchNumber: "",
      expiryDate: "",
      quantity: "",
      unit: "kg",
    },
  },
  "bill-of-materials": {
    title: "Bill of Materials",
    idKey: "id",
    columns: ["materialCode", "requiredQuantity", "unit"],
    fields: [
      { key: "materialCode", label: "Material", apiSelect: "material" },
      { key: "requiredQuantity", label: "Required Qty", type: "number" },
      { key: "unit", label: "Unit", readOnly: true },
    ],
    empty: { materialCode: "", requiredQuantity: "", unit: "kg" },
  },
};

const crudApis: Record<
  ModuleKey,
  {
    list: (init?: RequestInit) => Promise<unknown>;
    create: (body: unknown) => Promise<unknown>;
    update: (id: string, body: unknown) => Promise<unknown>;
    remove: (id: string, body?: unknown) => Promise<unknown>;
  }
> = {
  materials: materialsApi,
  "business-partners": businessPartnersApi,
  "goods-receipts": goodsReceiptsMasterApi,
  "bill-of-materials": billOfMaterialsApi,
};

const label = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

export default function ErpCrudClient({ module }: { module: ModuleKey }) {
  const config = configs[module];
  const pathname = usePathname();
  const dictionary = getClientDictionary(
    normalizeLocale(pathname.split("/")[1] || "en"),
  );
  const copy = { ...dictionary.common, ...dictionary.crud };
  const translatedTitle =
    module === "materials"
      ? dictionary.modules.materials
      : module === "business-partners"
        ? dictionary.modules.businessPartners
        : module === "goods-receipts"
          ? dictionary.modules.goodsReceipts
          : dictionary.modules.bom;
  const [rows, setRows] = useState<Row[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<Row>({ ...config.empty });
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function reload(signal?: AbortSignal) {
    setRows((await crudApis[module].list({ signal })) as Row[]);
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      reload(controller.signal),
      materialsApi.list({ signal: controller.signal }),
    ])
      .then(([, materialData]) => {
        if (!controller.signal.aborted)
          setMaterials(materialData as Material[]);
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [module]);

  const materialOptions: SelectOption[] = materials.map((material) => ({
    value: material.code,
    label: `${material.code} — ${material.name} (${material.unit})`,
    material,
  }));
  const reset = () => {
    setEditing(null);
    setForm({ ...config.empty });
    setError("");
  };
  const edit = (row: Row) => {
    setEditing(row);
    setForm(
      Object.fromEntries(
        config.fields.map(({ key }) => [
          key,
          row[key] == null ? "" : String(row[key]),
        ]),
      ) as Row,
    );
    setError("");
  };
  function choose(field: Field, option: SingleValue<SelectOption>) {
    setForm((current) => {
      if (!option) return { ...current, [field.key]: "" };
      return {
        ...current,
        materialCode: option.material.code,
        unit: option.material.unit,
      };
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = { ...form };
    if (payload.expiryDate === "") payload.expiryDate = null;
    try {
      const wasEditing = Boolean(editing);
      if (editing) {
        await crudApis[module].update(String(editing[config.idKey]), payload);
      } else {
        await crudApis[module].create(payload);
      }
      setEditing(null);
      setForm({ ...config.empty });
      setSuccess(
        wasEditing
          ? (copy.updateSuccess ?? "Data updated successfully.")
          : (copy.createSuccess ?? "Data created successfully."),
      );
      try {
        await reload();
      } catch (reloadError) {
        console.error(
          "Failed to refresh ERP list after successful save",
          reloadError,
        );
        setError(
          copy.refreshFailed ?? "The operation succeeded, but refresh failed.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }
  async function remove(row: Row) {
    if (!window.confirm(copy.deleteConfirm)) return;
    setError("");
    setSuccess("");
    try {
      await crudApis[module].remove(String(row[config.idKey]));
      if (editing?.[config.idKey] === row[config.idKey]) {
        setEditing(null);
        setForm({ ...config.empty });
      }
      setSuccess(copy.deleteSuccess ?? "Data deleted successfully.");
      try {
        await reload();
      } catch (reloadError) {
        console.error(
          "Failed to refresh ERP list after successful delete",
          reloadError,
        );
        setError(
          copy.refreshFailed ?? "The operation succeeded, but refresh failed.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.deleteFailed);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form
        onSubmit={submit}
        className="h-fit rounded-xl bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            {editing ? copy.edit : copy.add} {translatedTitle}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-emerald-700"
            >
              {copy.cancel}
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3">
          {config.fields.map((field) => (
            <label key={field.key} className="text-sm font-medium">
              {dictionary.crud.fields[
                field.key as keyof typeof dictionary.crud.fields
              ] ?? field.label}
              {field.apiSelect ? (
                <Select<SelectOption, false>
                  isClearable
                  isSearchable
                  placeholder={`${copy.search} ${(dictionary.crud.fields[field.key as keyof typeof dictionary.crud.fields] ?? field.label).toLowerCase()}...`}
                  options={materialOptions}
                  value={
                    materialOptions.find(
                      (option) => option.value === form[field.key],
                    ) ?? null
                  }
                  onChange={(option) => choose(field, option)}
                  className="mt-1 text-sm"
                />
              ) : field.type === "select" ? (
                <select
                  value={String(form[field.key] ?? "")}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                >
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={field.key !== "expiryDate"}
                  readOnly={Boolean(
                    field.readOnly || (editing && field.readOnlyOnEdit),
                  )}
                  type={field.type ?? "text"}
                  step={field.type === "number" ? "any" : undefined}
                  value={String(form[field.key] ?? "")}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 read-only:bg-slate-100"
                />
              )}
            </label>
          ))}
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
          {saving ? copy.saving : editing ? copy.save : copy.addData}
        </button>
      </form>
      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold">{translatedTitle}</h2>
          <span className="text-sm text-slate-500">
            {rows.length} {copy.data}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {config.columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-medium">
                    {label(column)}
                  </th>
                ))}
                <th className="px-4 py-3">{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-4 py-8 text-center"
                  >
                    {copy.loading}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length + 1}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    {copy.noData}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={String(row[config.idKey])}
                    className="border-t border-slate-100"
                  >
                    {config.columns.map((column) => (
                      <td key={column} className="px-4 py-3">
                        {isQuantityField(column)
                          ? formatQuantity(row[column])
                          : (row[column] ?? "-")}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => edit(row)}
                        className="mr-3 text-emerald-700"
                      >
                        {copy.edit}
                      </button>
                      <button
                        onClick={() => void remove(row)}
                        className="text-red-600"
                      >
                        {copy.delete}
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
