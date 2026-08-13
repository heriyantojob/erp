"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Select, { SingleValue } from "react-select";
import {
  formatQuantity,
  isQuantityField,
  normalizeQuantityInput,
} from "@/lib/format-quantity";
import { usePathname } from "next/navigation";
import { getClientDictionary, normalizeLocale } from "@/lib/i18n/client";
import { materialsApi } from "@/lib/api/erp/materials.api";
import { stockApi } from "@/lib/api/erp/stock.api";
import { stockReservationsApi } from "@/lib/api/erp/stock-reservations.api";
import { goodsReceiptApi } from "@/lib/api/erp/goods-receipt.api";
import { materialIssueApi } from "@/lib/api/erp/material-issue.api";
import { stockReversalApi } from "@/lib/api/erp/stock-reversal.api";
import { purchaseOrderApi } from "@/lib/api/erp/purchase-order.api";
import { productionOrderApi } from "@/lib/api/erp/production-order.api";

type Screen =
  | "goods-receipt"
  | "material-issue"
  | "availability"
  | "current-stock"
  | "ledger";
type Material = { code: string; name: string; unit: string };
type Stock = {
  id: string;
  materialCode: string;
  materialName: string;
  batchLotId: string;
  batchNumber: string;
  receivedAt: string;
  expiryDate?: string | null;
  qualityStatus: string;
  warehouseCode: string;
  locationCode?: string | null;
  quantityOnHand: string;
  reservedQuantity?: string;
  availableQuantity?: string;
  unit: string;
};
type Reservation = {
  id: string;
  reservationNumber: string;
  stockBalanceId: string;
  materialCode: string;
  batchNumber: string;
  warehouseCode: string;
  locationCode?: string | null;
  quantity: string;
  unit: string;
  referenceType: string;
  referenceId?: string | null;
  status: string;
  createdAt: string;
};
type LedgerRow = {
  id?: string;
  transactionAt: string;
  transactionNumber: string;
  transactionType: string;
  materialCode: string;
  materialName: string;
  batchNumber?: string | null;
  quantityIn?: string | null;
  quantityOut?: string | null;
  unit: string;
  referenceType?: string | null;
};
type MaterialOption = { value: string; label: string; item: Material };
type StockOption = { value: string; label: string; stock: Stock };
type LedgerOption = { value: string; label: string; transaction: LedgerRow };

function batchFifoTimestamp(batchNumber: string) {
  const match = /^LN\d+-(\d{2})-(\d{2})-(\d{2})$/i.exec(batchNumber.trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const [, day, month, year] = match;
  return Date.UTC(2000 + Number(year), Number(month) - 1, Number(day));
}

const currentStockColumns = [
  "materialCode",
  "materialName",
  "batchNumber",
  "receivedAt",
  "expiryDate",
  "qualityStatus",
  "warehouseCode",
  "locationCode",
  "quantityOnHand",
  "unit",
];

const availabilityColumns = [
  "materialCode",
  "materialName",
  "batchNumber",
  "warehouseCode",
  "locationCode",
  "quantityOnHand",
  "reservedQuantity",
  "availableQuantity",
  "unit",
];

const ledgerColumns = [
  "transactionAt",
  "transactionNumber",
  "transactionType",
  "materialCode",
  "materialName",
  "batchNumber",
  "quantityIn",
  "quantityOut",
  "unit",
  "referenceType",
];

export default function StockPrototypeClient({
  screen,
  warehouseCode,
}: {
  screen: Screen;
  warehouseCode?: string;
}) {
  const pathname = usePathname();
  const locale = normalizeLocale(pathname.split("/")[1] || "en");
  const dictionary = getClientDictionary(locale);
  const t = dictionary.stock;
  const interpolate = (
    template: string,
    values: Record<string, string | number>,
  ) =>
    Object.entries(values).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      template,
    );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [productionOrders, setProductionOrders] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState({
    receivedAt: new Date().toISOString().slice(0, 10),
    receiptNumber: "",
    materialCode: "",
    batchNumber: "",
    expiryDate: "",
    quantity: "",
    unit: "",
    purchaseOrderId: "",
  });
  const [issue, setIssue] = useState({
    stockBalanceId: "",
    quantity: "",
    productionOrderId: "",
  });
  const [reversal, setReversal] = useState({
    transactionNumber: "",
    reason: "",
  });
  const [reservation, setReservation] = useState({
    stockBalanceId: "",
    quantity: "",
    referenceType: "manual",
    referenceId: "",
  });
  const [releaseReason, setReleaseReason] = useState<Record<string, string>>(
    {},
  );

  async function loadScreenData(signal?: AbortSignal) {
    const stockRequest =
      screen === "ledger"
        ? stockApi.ledger({ signal })
        : screen === "current-stock"
          ? stockApi.current({ signal })
          : stockApi.availability({ signal });

    const [materialData, stockData, reservationData, poData, productionData] =
      await Promise.all([
        materialsApi.list({ signal }),
        stockRequest,
        screen === "availability"
          ? stockReservationsApi.list("active", { signal })
          : Promise.resolve([]),
        screen === "goods-receipt"
          ? purchaseOrderApi.list({ signal })
          : Promise.resolve([]),
        screen === "material-issue"
          ? productionOrderApi.list({ signal })
          : Promise.resolve([]),
      ]);

    setMaterials(materialData);
    setReservations(reservationData);
    setPurchaseOrders(poData);
    setProductionOrders(productionData);
    if (screen === "ledger") {
      setLedger(stockData);
      setStocks([]);
    } else {
      const visibleStocks =
        warehouseCode
          ? stockData.filter((x: Stock) => x.warehouseCode === warehouseCode)
          : screen === "material-issue"
            ? stockData.filter((x: Stock) => x.warehouseCode === "MAIN")
            : stockData;
      setStocks(
        screen === "current-stock"
          ? [...visibleStocks].sort((a: Stock, b: Stock) => {
              const byBatchDate =
                batchFifoTimestamp(a.batchNumber) -
                batchFifoTimestamp(b.batchNumber);
              return byBatchDate || a.batchNumber.localeCompare(b.batchNumber);
            })
          : visibleStocks,
      );
      setLedger([]);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage("");
    setError("");

    loadScreenData(controller.signal)
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : t.messages.loadFailed,
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [screen, warehouseCode]);

  const materialOptions = useMemo<MaterialOption[]>(
    () =>
      materials.map((item) => ({
        value: item.code,
        label: `${item.code} - ${item.name} (${item.unit})`,
        item,
      })),
    [materials],
  );
  const stockOptions = useMemo<StockOption[]>(
    () =>
      stocks.map((stock) => ({
        value: stock.id,
        label: `${stock.materialCode} | Batch ${stock.batchNumber} | ${formatQuantity(stock.availableQuantity ?? stock.quantityOnHand, locale)} ${stock.unit}`,
        stock,
      })),
    [stocks, locale],
  );
  const ledgerOptions = useMemo<LedgerOption[]>(
    () =>
      ledger
        .filter((row) => row.referenceType !== "reversal")
        .map((transaction) => ({
          value: transaction.transactionNumber,
          label: `${transaction.transactionNumber} | ${transaction.transactionType} | ${transaction.materialCode} | Batch ${transaction.batchNumber ?? "-"}`,
          transaction,
        })),
    [ledger],
  );

  const selectedStock = stocks.find(
    (stock) => stock.id === issue.stockBalanceId,
  );
  const selectedReservationStock = stocks.find(
    (stock) => stock.id === reservation.stockBalanceId,
  );

  async function submitReceipt(event: FormEvent) {
    event.preventDefault();
    const duplicateBatch = receipt.batchNumber.trim().toLowerCase();
    if (
      stocks.some(
        (stock) => stock.batchNumber.trim().toLowerCase() === duplicateBatch,
      )
    ) {
      setError(`Batch number "${receipt.batchNumber}" already exists. Enter a unique batch number.`);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data: any = await goodsReceiptApi.create({
        ...receipt,
        expiryDate: receipt.expiryDate || null,
      });
      setMessage(
        `${interpolate(t.messages.receiptPosted, { batch: data.batchLotId, warehouse: data.warehouseCode, location: data.locationCode })} ${t.messages.dataRefreshed}`,
      );
      setReceipt({
        receivedAt: new Date().toISOString().slice(0, 10),
        receiptNumber: "",
        materialCode: "",
        batchNumber: "",
        expiryDate: "",
        quantity: "",
        unit: "",
        purchaseOrderId: "",
      });
      try {
        await loadScreenData();
      } catch (refreshError) {
        console.error(
          "Failed to refresh stock after successful receipt",
          refreshError,
        );
        setError(t.messages.refreshFailed);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t.messages.receiptFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitIssue(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data: any = await materialIssueApi.create(issue);
      setMessage(
        `${interpolate(t.messages.issuePosted, { quantity: data.issuedQuantity, remaining: data.remainingQuantity, unit: data.unit })} ${t.messages.dataRefreshed}`,
      );
      setIssue({ stockBalanceId: "", quantity: "", productionOrderId: "" });
      try {
        await loadScreenData();
      } catch (refreshError) {
        console.error(
          "Failed to refresh stock after successful issue",
          refreshError,
        );
        setError(t.messages.refreshFailed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.messages.issueFailed);
    } finally {
      setSaving(false);
    }
  }

  async function submitReservation(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data: any = await stockReservationsApi.create({
        ...reservation,
        referenceId: reservation.referenceId || null,
      });
      setMessage(
        interpolate(t.messages.reservationCreated, {
          reserved: data.reservedQuantity,
          available: data.availableQuantity,
          unit: data.unit,
        }),
      );
      setReservation({
        stockBalanceId: "",
        quantity: "",
        referenceType: "manual",
        referenceId: "",
      });
      try {
        await loadScreenData();
      } catch (refreshError) {
        console.error(
          "Failed to refresh availability after reservation",
          refreshError,
        );
        setError(t.messages.refreshFailed);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t.messages.reservationFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  async function releaseReservation(id: string) {
    const reason = (releaseReason[id] ?? "").trim();
    if (reason.length < 3) {
      setError(t.messages.releaseReasonRequired);
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await stockReservationsApi.release(id, { reason });
      setMessage(t.messages.reservationReleased);
      setReleaseReason((current) => ({ ...current, [id]: "" }));
      try {
        await loadScreenData();
      } catch (refreshError) {
        console.error(
          "Failed to refresh availability after reservation release",
          refreshError,
        );
        setError(t.messages.refreshFailed);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t.messages.releaseFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitReversal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data: any = await stockReversalApi.reverse(
        reversal.transactionNumber,
        { reason: reversal.reason },
      );
      setMessage(
        `${interpolate(t.messages.reversalPosted, { number: data.transactionNumber, reversed: data.reversedTransactionNumber })} ${t.messages.dataRefreshed}`,
      );
      setReversal({ transactionNumber: "", reason: "" });
      try {
        await loadScreenData();
      } catch (refreshError) {
        console.error(
          "Failed to refresh ledger after successful reversal",
          refreshError,
        );
        setError(t.messages.refreshFailed);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t.messages.reversalFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  if (screen === "goods-receipt") {
    return (
      <section className="max-w-xl rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">{t.titles["goods-receipt"]}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.receiptDescription}</p>
        <form onSubmit={submitReceipt} className="mt-5 grid gap-3">
          <label className="text-sm font-medium">
            {t.labels.receiptDate}
            <input
              required
              type="date"
              value={receipt.receivedAt}
              onChange={(event) =>
                setReceipt({ ...receipt, receivedAt: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.receiptNumber}
            <input
              required
              value={receipt.receiptNumber}
              onChange={(event) =>
                setReceipt({ ...receipt, receiptNumber: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm font-medium">
            {(t.labels as any).purchaseOrder ?? "Purchase Order"}
            <select
              value={receipt.purchaseOrderId}
              onChange={(event) => {
                const po = purchaseOrders.find(
                  (x) => x.id === event.target.value,
                );
                setReceipt({
                  ...receipt,
                  purchaseOrderId: event.target.value,
                  materialCode: po?.materialCode ?? receipt.materialCode,
                  quantity: po?.quantity
                    ? normalizeQuantityInput(po.quantity)
                    : receipt.quantity,
                  unit: po?.unit ?? receipt.unit,
                });
              }}
              className="mt-1 w-full rounded border bg-white p-2"
            >
              <option value="">--</option>
              {purchaseOrders
                .filter((x) => x.status === "approved")
                .map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} · {po.materialCode} · {formatQuantity(po.quantity, locale)}{" "}
                    {po.unit}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {t.labels.material}
            <Select<MaterialOption, false>
              isSearchable
              options={materialOptions}
              value={
                materialOptions.find(
                  (option) => option.value === receipt.materialCode,
                ) ?? null
              }
              onChange={(option: SingleValue<MaterialOption>) =>
                setReceipt({
                  ...receipt,
                  materialCode: option?.value ?? "",
                  unit: option?.item.unit ?? "",
                })
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.batchNumber}
            <input
              required
              value={receipt.batchNumber}
              onChange={(event) =>
                setReceipt({ ...receipt, batchNumber: event.target.value })
              }
              placeholder="LN01-13-08-26"
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.expiryDate}
            <input
              type="date"
              value={receipt.expiryDate}
              onChange={(event) =>
                setReceipt({ ...receipt, expiryDate: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.quantity}
            <input
              required
              type="number"
              step="any"
              value={receipt.quantity}
              onChange={(event) =>
                setReceipt({ ...receipt, quantity: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.unit}
            <input
              required
              readOnly
              value={receipt.unit}
              className="mt-1 w-full rounded border bg-slate-100 p-2"
            />
          </label>
          <button
            disabled={saving}
            className="rounded bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? dictionary.common.posting : t.buttons.postReceipt}
          </button>
        </form>
        {message && (
          <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    );
  }

  if (screen === "material-issue") {
    return (
      <section className="max-w-xl rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">{t.titles["material-issue"]}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.issueDescription}</p>
        <form onSubmit={submitIssue} className="mt-5 grid gap-3">
          <label className="text-sm font-medium">
            {(t.labels as any).productionOrder ?? "Production Order"}
            <select
              value={issue.productionOrderId}
              onChange={(event) =>
                setIssue({ ...issue, productionOrderId: event.target.value })
              }
              className="mt-1 w-full rounded border bg-white p-2"
            >
              <option value="">--</option>
              {productionOrders
                .filter((x) => ["released", "in_progress"].includes(x.status))
                .map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} · {po.finishedMaterialCode} · {po.status}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            {t.labels.availableBatch}
            <Select<StockOption, false>
              isSearchable
              options={stockOptions}
              value={
                stockOptions.find(
                  (option) => option.value === issue.stockBalanceId,
                ) ?? null
              }
              onChange={(option: SingleValue<StockOption>) =>
                setIssue({ ...issue, stockBalanceId: option?.value ?? "" })
              }
              className="mt-1"
            />
          </label>
          {selectedStock && (
            <p className="rounded bg-slate-50 p-3 text-sm">
              {t.available}:{" "}
              <strong>
                {formatQuantity(selectedStock.availableQuantity ??
                  selectedStock.quantityOnHand, locale)}{" "}
                {selectedStock.unit}
              </strong>{" "}
              - {t.batch} {selectedStock.batchNumber} - {t.received}{" "}
              {selectedStock.receivedAt}
            </p>
          )}
          <label className="text-sm font-medium">
            {t.labels.issueQuantity}
            <input
              required
              type="number"
              step="any"
              value={issue.quantity}
              onChange={(event) =>
                setIssue({ ...issue, quantity: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <button
            disabled={saving}
            className="rounded bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? dictionary.common.posting : t.buttons.postIssue}
          </button>
        </form>
        {message && (
          <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
    );
  }

  const rows = screen === "ledger" ? ledger : stocks;
  const columns =
    screen === "ledger"
      ? ledgerColumns
      : screen === "availability"
        ? availabilityColumns
        : currentStockColumns;
  const table = (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex justify-between border-b px-5 py-4">
        <h2 className="font-bold">{t.titles[screen]}</h2>
        <span className="text-sm text-slate-500">
          {rows.length} {dictionary.common.data}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {t.columns[column as keyof typeof t.columns] ?? column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  {dictionary.common.loading}
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr
                  key={String(row.id ?? row.transactionNumber ?? index)}
                  className="border-t"
                >
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3">
                      {isQuantityField(column)
                        ? formatQuantity(row[column as keyof typeof row], locale)
                        : (row[column as keyof typeof row] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-slate-500"
                >
                  {dictionary.common.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  if (screen === "availability") {
    return (
      <div className="grid gap-6">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">{t.reservationTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t.reservationDescription}
          </p>
          <form
            onSubmit={submitReservation}
            className="mt-5 grid gap-3 lg:grid-cols-4 lg:items-end"
          >
            <label className="text-sm font-medium lg:col-span-2">
              {t.labels.availableBatch}
              <Select<StockOption, false>
                isSearchable
                options={stockOptions.filter(
                  (option) =>
                    Number(
                      option.stock.availableQuantity ??
                        option.stock.quantityOnHand,
                    ) > 0,
                )}
                value={
                  stockOptions.find(
                    (option) => option.value === reservation.stockBalanceId,
                  ) ?? null
                }
                onChange={(option: SingleValue<StockOption>) =>
                  setReservation({
                    ...reservation,
                    stockBalanceId: option?.value ?? "",
                  })
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              {t.labels.reserveQuantity}
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={reservation.quantity}
                onChange={(event) =>
                  setReservation({
                    ...reservation,
                    quantity: event.target.value,
                  })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <button
              disabled={saving || !reservation.stockBalanceId}
              className="rounded bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {saving ? dictionary.common.posting : t.buttons.reserveStock}
            </button>
            <label className="text-sm font-medium">
              {t.labels.referenceType}
              <input
                value={reservation.referenceType}
                onChange={(event) =>
                  setReservation({
                    ...reservation,
                    referenceType: event.target.value,
                  })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="text-sm font-medium lg:col-span-2">
              {t.labels.referenceId}
              <input
                value={reservation.referenceId}
                onChange={(event) =>
                  setReservation({
                    ...reservation,
                    referenceId: event.target.value,
                  })
                }
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            {selectedReservationStock && (
              <p className="rounded bg-slate-50 p-3 text-sm">
                {t.onHand}:{" "}
                <strong>
                  {formatQuantity(selectedReservationStock.quantityOnHand, locale)}{" "}
                  {selectedReservationStock.unit}
                </strong>{" "}
                · {t.reserved}:{" "}
                <strong>
                  {formatQuantity(selectedReservationStock.reservedQuantity ?? "0", locale)}{" "}
                  {selectedReservationStock.unit}
                </strong>{" "}
                · {t.available}:{" "}
                <strong>
                  {formatQuantity(selectedReservationStock.availableQuantity ??
                    selectedReservationStock.quantityOnHand, locale)}{" "}
                  {selectedReservationStock.unit}
                </strong>
              </p>
            )}
          </form>
          {message && (
            <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
        {table}
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">{t.activeReservations}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3">{t.columns.reservationNumber}</th>
                  <th className="px-4 py-3">{t.columns.materialCode}</th>
                  <th className="px-4 py-3">{t.columns.batchNumber}</th>
                  <th className="px-4 py-3">{t.columns.reservedQuantity}</th>
                  <th className="px-4 py-3">{t.columns.referenceType}</th>
                  <th className="px-4 py-3">{t.labels.reason}</th>
                  <th className="px-4 py-3">{dictionary.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length ? (
                  reservations.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3">{item.reservationNumber}</td>
                      <td className="px-4 py-3">{item.materialCode}</td>
                      <td className="px-4 py-3">{item.batchNumber}</td>
                      <td className="px-4 py-3">
                        {formatQuantity(item.quantity, locale)} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        {item.referenceType}
                        {item.referenceId ? ` / ${item.referenceId}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          minLength={3}
                          value={releaseReason[item.id] ?? ""}
                          onChange={(event) =>
                            setReleaseReason((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded border p-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => releaseReservation(item.id)}
                          className="rounded border px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
                        >
                          {t.buttons.releaseReservation}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {dictionary.common.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (screen !== "ledger") {
    return (
      <>
        {table}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold">{t.reverseTitle}</h2>
          <p className="text-sm text-slate-600">{t.reverseDescription}</p>
        </div>
        <form
          onSubmit={submitReversal}
          className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
        >
          <label className="text-sm font-medium">
            {t.labels.transaction}
            <Select<LedgerOption, false>
              isSearchable
              options={ledgerOptions}
              value={
                ledgerOptions.find(
                  (option) => option.value === reversal.transactionNumber,
                ) ?? null
              }
              onChange={(option: SingleValue<LedgerOption>) =>
                setReversal({
                  ...reversal,
                  transactionNumber: option?.value ?? "",
                })
              }
              className="mt-1"
            />
          </label>
          <label className="text-sm font-medium">
            {t.labels.reason}
            <input
              required
              minLength={3}
              value={reversal.reason}
              onChange={(event) =>
                setReversal({ ...reversal, reason: event.target.value })
              }
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <button
            disabled={saving || !reversal.transactionNumber}
            className="rounded bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {saving ? dictionary.common.posting : t.buttons.postReversal}
          </button>
        </form>
        {message && (
          <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>
      {table}
    </div>
  );
}
