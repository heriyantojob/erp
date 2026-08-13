"use client";
import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getClientDictionary, normalizeLocale } from "@/lib/i18n/client";
import { materialsApi } from "@/lib/api/erp/materials.api";
import { stockApi } from "@/lib/api/erp/stock.api";
import { purchaseRequisitionApi } from "@/lib/api/erp/purchase-requisition.api";
import { purchaseOrderApi } from "@/lib/api/erp/purchase-order.api";
import { incomingQualityApi } from "@/lib/api/erp/incoming-quality.api";
import { productionOrderApi } from "@/lib/api/erp/production-order.api";
import { finishedGoodsReceiptApi } from "@/lib/api/erp/finished-goods-receipt.api";
import { salesOrderApi } from "@/lib/api/erp/sales-order.api";
import { deliveryApi } from "@/lib/api/erp/delivery.api";
import { formatQuantity } from "@/lib/format-quantity";
import SupplierSelect from "@/components/erp/selects/SupplierSelect";
type Step =
  | "purchase-requisition"
  | "purchase-order"
  | "incoming-quality"
  | "production-order"
  | "manufacturing"
  | "finished-goods-receipt"
  | "sales-order"
  | "customer-delivery";
type AnyRow = Record<string, any>;
export default function WorkflowStepClient({ step }: { step: Step }) {
  const path = usePathname();
  const locale = normalizeLocale(path.split("/")[1] || "en");
  const d: any = getClientDictionary(locale);
  const t = d.workflow,
    meta = t.steps[step];
  const [rows, setRows] = useState<AnyRow[]>([]),
    [materials, setMaterials] = useState<AnyRow[]>([]),
    [stocks, setStocks] = useState<AnyRow[]>([]),
    [prs, setPrs] = useState<AnyRow[]>([]),
    [pros, setPros] = useState<AnyRow[]>([]),
    [sales, setSales] = useState<AnyRow[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const listForStep = () =>
    step === "purchase-requisition"
      ? purchaseRequisitionApi.list()
      : step === "purchase-order"
        ? purchaseOrderApi.list()
        : step === "incoming-quality"
          ? incomingQualityApi.list()
          : ["production-order", "manufacturing"].includes(step)
            ? productionOrderApi.list()
            : step === "finished-goods-receipt"
              ? finishedGoodsReceiptApi.list()
              : step === "sales-order"
                ? salesOrderApi.list()
                : deliveryApi.list();
  async function load() {
    setLoading(true);
    try {
      const jobs: any[] = [listForStep(), materialsApi.list()];
      if (step === "purchase-order") jobs.push(purchaseRequisitionApi.list());
      if (step === "sales-order") jobs.push(stockApi.availability());
      if (["manufacturing", "finished-goods-receipt"].includes(step))
        jobs.push(productionOrderApi.list());
      if (step === "customer-delivery") jobs.push(salesOrderApi.list());
      const result = await Promise.all(jobs);
      setRows(result[0]);
      setMaterials(result[1]);
      let i = 2;
      if (step === "purchase-order") setPrs(result[i++]);
      if (step === "sales-order")
        setStocks(result[i++].filter((x: any) => x.warehouseCode === "FG"));
      if (["manufacturing", "finished-goods-receipt"].includes(step))
        setPros(result[i++]);
      if (step === "customer-delivery") setSales(result[i++]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [step]);
  const mat = (code: string) => materials.find((x) => x.code === code);
  function val(name: string) {
    return form[name] || "";
  }
  function put(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }
  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      let body: any = {};
      if (step === "purchase-requisition")
        body = {
          requisitionNumber: val("number"),
          materialCode: val("material"),
          quantity: val("quantity"),
          unit: mat(val("material"))?.unit || val("unit"),
          neededAt: val("date") || null,
          notes: val("notes") || null,
        };
      if (step === "purchase-order") {
        const pr = prs.find((x) => x.id === val("requisition"));
        body = {
          orderNumber: val("number"),
          requisitionId: pr?.id || null,
          supplierCode: val("supplier") || null,
          materialCode: pr?.materialCode || val("material"),
          quantity: pr?.quantity || val("quantity"),
          unit: pr?.unit || mat(val("material"))?.unit || val("unit"),
          expectedAt: val("date") || null,
        };
      }
      if (step === "production-order")
        body = {
          orderNumber: val("number"),
          finishedMaterialCode: val("material"),
          plannedQuantity: val("quantity"),
          unit: mat(val("material"))?.unit || val("unit"),
          plannedAt: val("date") || null,
        };
      if (step === "finished-goods-receipt")
        body = {
          productionOrderId: val("productionOrder"),
          batchNumber: val("batch"),
          quantity: val("quantity"),
          unit:
            pros.find((x) => x.id === val("productionOrder"))?.unit ||
            val("unit"),
        };
      if (step === "sales-order") {
        const st = stocks.find((x) => x.id === val("stock"));
        body = {
          orderNumber: val("number"),
          customerCode: val("customer") || null,
          materialCode: st?.materialCode,
          quantity: val("quantity"),
          unit: st?.unit,
          requestedAt: val("date") || null,
          stockBalanceId: val("stock"),
        };
      }
      if (step === "customer-delivery")
        body = {
          deliveryNumber: val("number"),
          salesOrderId: val("salesOrder"),
          deliveredAt: val("date"),
        };
      if (step === "purchase-requisition")
        await purchaseRequisitionApi.create(body);
      else if (step === "purchase-order") await purchaseOrderApi.create(body);
      else if (step === "production-order")
        await productionOrderApi.create(body);
      else if (step === "finished-goods-receipt")
        await finishedGoodsReceiptApi.create(body);
      else if (step === "sales-order") await salesOrderApi.create(body);
      else if (step === "customer-delivery") await deliveryApi.create(body);
      setForm({});
      setMessage(t.success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setSaving(false);
    }
  }
  async function action(run: () => Promise<unknown>) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await run();
      setMessage(t.actionSuccess);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
      return false;
    } finally {
      setSaving(false);
    }
  }
  const statusBadge = (s: string) => (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${["approved", "released", "completed", "delivered", "posted", "confirmed"].includes(s) ? "bg-emerald-100 text-emerald-800" : s === "rejected" || s === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}
    >
      {s}
    </span>
  );
  const field = (label: string, name: string, type = "text") => (
    <label className="text-sm font-medium">
      {label}
      <input
        required={!["notes", "supplier", "customer"].includes(name)}
        type={type}
        value={val(name)}
        onChange={(e) => put(name, e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
      />
    </label>
  );
  const select = (
    label: string,
    name: string,
    opts: AnyRow[],
    get: (x: AnyRow) => [string, string],
  ) => (
    <label className="text-sm font-medium">
      {label}
      <select
        required
        value={val(name)}
        onChange={(e) => put(name, e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"
      >
        <option value="">--</option>
        {opts.map((x) => {
          const [v, l] = get(x);
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
  const canCreate = !["incoming-quality", "manufacturing"].includes(step);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {t.title}
            </p>
            <h2 className="mt-1 text-xl font-bold">{meta.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{meta.desc}</p>
          </div>
          <button
            onClick={() => load()}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {t.refresh}
          </button>
        </div>
        {message && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {canCreate && (
          <form
            onSubmit={create}
            className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {[
              "purchase-requisition",
              "purchase-order",
              "production-order",
              "sales-order",
              "customer-delivery",
            ].includes(step) && field(t.fields.number, "number")}
            {step === "purchase-order" &&
              select(
                t.fields.requisition,
                "requisition",
                prs.filter((x) => x.status === "approved"),
                (x) => [
                  x.id,
                  `${x.requisitionNumber} · ${x.materialCode} · ${formatQuantity(x.quantity, locale)} ${x.unit}`,
                ],
              )}
            {step === "purchase-order" && (
              <label className="text-sm font-medium">
                {t.fields.supplier}
                <div className="mt-1">
                  <SupplierSelect
                    required
                    value={val("supplier")}
                    onChange={(supplierCode) =>
                      put("supplier", supplierCode ?? "")
                    }
                    placeholder={`${t.fields.supplier} - search or type manually`}
                    noOptionsText="No supplier found. Type a supplier code and press Enter."
                  />
                </div>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Search existing suppliers or type a new supplier code
                  manually.
                </span>
              </label>
            )}
            {["purchase-requisition", "production-order"].includes(step) &&
              select(t.fields.material, "material", materials, (x) => [
                x.code,
                `${x.code} · ${x.name} (${x.unit})`,
              ])}
            {step === "finished-goods-receipt" &&
              select(
                t.fields.productionOrder,
                "productionOrder",
                pros.filter((x) =>
                  ["in_progress", "completed"].includes(x.status),
                ),
                (x) => [x.id, `${x.orderNumber} · ${x.finishedMaterialCode}`],
              )}
            {step === "finished-goods-receipt" &&
              field(t.fields.batch, "batch")}
            {step === "sales-order" &&
              select(t.fields.stock, "stock", stocks, (x) => [
                x.id,
                `${x.materialCode} · ${x.batchNumber} · ${formatQuantity(x.availableQuantity, locale)} ${x.unit}`,
              ])}
            {step === "sales-order" && field(t.fields.customer, "customer")}
            {step === "customer-delivery" &&
              select(
                t.fields.salesOrder,
                "salesOrder",
                sales.filter((x) => x.status === "confirmed"),
                (x) => [
                  x.id,
                  `${x.orderNumber} · ${x.materialCode} · ${formatQuantity(x.quantity, locale)} ${x.unit}`,
                ],
              )}
            {[
              "purchase-requisition",
              "production-order",
              "finished-goods-receipt",
              "sales-order",
            ].includes(step) && field(t.fields.quantity, "quantity", "number")}
            {[
              "purchase-requisition",
              "purchase-order",
              "production-order",
              "sales-order",
              "customer-delivery",
            ].includes(step) && field(t.fields.date, "date", "date")}
            {step === "purchase-requisition" && field(t.fields.notes, "notes")}
            <div className="flex items-end">
              <button
                disabled={saving}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {step === "finished-goods-receipt"
                  ? t.actions.receive
                  : step === "customer-delivery"
                    ? t.actions.deliver
                    : t.actions.create}
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">{t.loading}</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">{t.table.document}</th>
                  <th className="p-3">{t.table.material}</th>
                  <th className="p-3">{t.table.quantity}</th>
                  <th className="p-3">{t.status}</th>
                  <th className="p-3">{t.table.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">
                      {r.requisitionNumber ||
                        r.orderNumber ||
                        r.receiptNumber ||
                        r.deliveryNumber ||
                        r.batchNumber ||
                        r.id}
                    </td>
                    <td className="p-3">
                      {r.materialCode || r.finishedMaterialCode || "-"}
                      {r.batchNumber ? ` · ${r.batchNumber}` : ""}
                    </td>
                    <td className="p-3">
                      {formatQuantity(r.quantity ?? r.plannedQuantity, locale)} {r.unit || ""}
                    </td>
                    <td className="p-3">
                      {statusBadge(r.status || r.qualityStatus || "-")}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {step === "purchase-requisition" &&
                          r.status === "submitted" && (
                            <button
                              onClick={() =>
                                action(() =>
                                  purchaseRequisitionApi.approve(r.id),
                                )
                              }
                              className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                            >
                              {t.actions.approve}
                            </button>
                          )}
                        {step === "purchase-order" && r.status === "draft" && (
                          <button
                            onClick={() =>
                              action(() =>
                                purchaseOrderApi.setStatus(r.id, {
                                  status: "approved",
                                }),
                              )
                            }
                            className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                          >
                            {t.actions.approve}
                          </button>
                        )}
                        {step === "incoming-quality" &&
                          r.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  action(() =>
                                    incomingQualityApi.inspect(r.id, {
                                      status: "released",
                                      result: `${t.actions.release}: ${meta.title}`,
                                    }),
                                  )
                                }
                                className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                              >
                                {t.actions.release}
                              </button>
                              <button
                                onClick={() =>
                                  action(() =>
                                    incomingQualityApi.inspect(r.id, {
                                      status: "rejected",
                                      result: `${t.actions.reject}: ${meta.title}`,
                                    }),
                                  )
                                }
                                className="rounded bg-rose-600 px-2 py-1 text-xs text-white"
                              >
                                {t.actions.reject}
                              </button>
                            </>
                          )}
                        {step === "manufacturing" &&
                          r.status === "released" && (
                            <button
                              onClick={() =>
                                action(() => productionOrderApi.start(r.id))
                              }
                              className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                            >
                              {t.actions.start}
                            </button>
                          )}
                        {step === "manufacturing" &&
                          r.status === "in_progress" && (
                            <button
                              onClick={() =>
                                action(() => productionOrderApi.complete(r.id))
                              }
                              className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                            >
                              {t.actions.complete}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
