import { normalizeLocale } from "@/lib/i18n/client";

export class ErpApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status = 0, code?: string, details?: unknown) {
    super(message);
    this.name = "ErpApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function currentLocale() {
  if (typeof window === "undefined") return "en";
  return normalizeLocale(window.location.pathname.split("/")[1] || "en");
}

function fallbackMessage(status: number, path?: string) {
  const locale = currentLocale();
  const t = {
    en: {
      unauthorized: "Your session has expired. Please sign in again.",
      forbidden: "You do not have permission to perform this action.",
      notFound: "The requested ERP endpoint was not found.",
      server: "ERP API server error",
      failed: "ERP request failed",
      network:
        "Cannot connect to the ERP API. Make sure erp-api is running on the configured port.",
    },
    id: {
      unauthorized: "Sesi Anda telah berakhir. Silakan login kembali.",
      forbidden: "Anda tidak memiliki hak akses untuk melakukan tindakan ini.",
      notFound: "Endpoint ERP yang diminta tidak ditemukan.",
      server: "Terjadi kesalahan pada server ERP API",
      failed: "Request ERP gagal",
      network:
        "Tidak dapat terhubung ke ERP API. Pastikan erp-api berjalan pada port yang dikonfigurasi.",
    },
    ko: {
      unauthorized: "세션이 만료되었습니다. 다시 로그인해 주세요.",
      forbidden: "이 작업을 수행할 권한이 없습니다.",
      notFound: "요청한 ERP 엔드포인트를 찾을 수 없습니다.",
      server: "ERP API 서버 오류",
      failed: "ERP 요청 실패",
      network:
        "ERP API에 연결할 수 없습니다. erp-api가 설정된 포트에서 실행 중인지 확인하세요.",
    },
  }[locale];
  if (status === 0) return t.network;
  if (status === 401) return t.unauthorized;
  if (status === 403) return t.forbidden;
  if (status === 404) return path ? `${t.notFound} (${path})` : t.notFound;
  if (status >= 500) return `${t.server} (HTTP ${status}).`;
  return `${t.failed} (HTTP ${status}).`;
}

function extractMessage(body: unknown, status: number, path?: string) {
  if (body && typeof body === "object") {
    const data = body as {
      message?: string;
      code?: string;
      errors?: Array<{ message?: string }>;
      database?: {
        code?: string | null;
        constraint?: string | null;
        table?: string | null;
        column?: string | null;
        detail?: string | null;
      };
    };
    const validationDetails = Array.isArray(data.errors)
      ? data.errors
          .map((item) => item?.message)
          .filter(Boolean)
          .join(" ")
      : "";
    if (validationDetails) return validationDetails;
    if (data.message) {
      const db = data.database;
      const technical = db
        ? [
            db.code ? `DB ${db.code}` : "",
            db.table ? `table: ${db.table}` : "",
            db.column ? `column: ${db.column}` : "",
            db.constraint ? `constraint: ${db.constraint}` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "";
      return technical ? `${data.message} [${technical}]` : data.message;
    }
  }
  if (
    typeof body === "string" &&
    body.trim() &&
    !body.trim().startsWith("<!DOCTYPE")
  )
    return body.trim();
  return fallbackMessage(status, path);
}

export async function erpRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cleanPath = path.replace(/^\/+/, "");
  const headers = new Headers(init?.headers);
  headers.set("X-Locale", currentLocale());
  headers.set("Accept", "application/json");
  if (init?.body != null && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    // Same-origin request. next.config.js rewrites /api/erp/* to the Express /api/erp/* contract.
    response = await fetch(`/api/erp/${cleanPath}`, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch (cause) {
    throw new ErpApiError(fallbackMessage(0), 0, "NETWORK_ERROR", cause);
  }

  if (response.status === 204) return null as T;
  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown = null;
  try {
    body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const data =
      body && typeof body === "object"
        ? (body as { code?: string })
        : undefined;
    throw new ErpApiError(
      extractMessage(body, response.status, `/api/erp/${cleanPath}`),
      response.status,
      data?.code,
      body,
    );
  }
  return body as T;
}
