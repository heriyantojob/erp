import type { Request, Response } from "express";
import { z } from "zod";

export type ApiLocale = "en" | "id" | "ko";

type Messages = {
  invalidRequest: string;
  validationFailed: string;
  required: string;
  invalidType: string;
  invalidEmail: string;
  invalidUuid: string;
  invalidDate: string;
  invalidEnum: string;
  tooSmallString: string;
  tooSmallNumber: string;
  tooBigString: string;
  tooBigNumber: string;
  duplicate: string;
  referenceNotFound: string;
  databaseError: string;
};

const messages: Record<ApiLocale, Messages> = {
  en: {
    invalidRequest: "Invalid request.",
    validationFailed: "Some submitted fields are invalid.",
    required: "{field} is required.",
    invalidType: "{field} has an invalid value.",
    invalidEmail: "{field} must be a valid email address.",
    invalidUuid: "{field} must be a valid UUID.",
    invalidDate: "{field} must use the YYYY-MM-DD format.",
    invalidEnum: "{field} must be one of: {options}.",
    tooSmallString: "{field} must contain at least {minimum} character(s).",
    tooSmallNumber: "{field} must be greater than or equal to {minimum}.",
    tooBigString: "{field} must contain at most {maximum} character(s).",
    tooBigNumber: "{field} must be less than or equal to {maximum}.",
    duplicate: "A record with the same {field} already exists.",
    referenceNotFound: "The referenced data was not found or is no longer active.",
    databaseError: "The data could not be saved because of a database constraint.",
  },
  id: {
    invalidRequest: "Permintaan tidak valid.",
    validationFailed: "Beberapa field yang dikirim tidak valid.",
    required: "{field} wajib diisi.",
    invalidType: "Nilai {field} tidak valid.",
    invalidEmail: "{field} harus berupa alamat email yang valid.",
    invalidUuid: "{field} harus berupa UUID yang valid.",
    invalidDate: "{field} harus menggunakan format YYYY-MM-DD.",
    invalidEnum: "{field} harus salah satu dari: {options}.",
    tooSmallString: "{field} minimal {minimum} karakter.",
    tooSmallNumber: "{field} harus lebih besar atau sama dengan {minimum}.",
    tooBigString: "{field} maksimal {maximum} karakter.",
    tooBigNumber: "{field} harus lebih kecil atau sama dengan {maximum}.",
    duplicate: "Data dengan {field} yang sama sudah tersedia.",
    referenceNotFound: "Data referensi tidak ditemukan atau sudah tidak aktif.",
    databaseError: "Data tidak dapat disimpan karena melanggar aturan database.",
  },
  ko: {
    invalidRequest: "잘못된 요청입니다.",
    validationFailed: "입력한 일부 필드가 올바르지 않습니다.",
    required: "{field} 필드는 필수입니다.",
    invalidType: "{field} 값이 올바르지 않습니다.",
    invalidEmail: "{field} 필드는 올바른 이메일 주소여야 합니다.",
    invalidUuid: "{field} 필드는 올바른 UUID여야 합니다.",
    invalidDate: "{field} 필드는 YYYY-MM-DD 형식이어야 합니다.",
    invalidEnum: "{field} 필드는 다음 중 하나여야 합니다: {options}.",
    tooSmallString: "{field} 필드는 최소 {minimum}자 이상이어야 합니다.",
    tooSmallNumber: "{field} 필드는 {minimum} 이상이어야 합니다.",
    tooBigString: "{field} 필드는 최대 {maximum}자까지 입력할 수 있습니다.",
    tooBigNumber: "{field} 필드는 {maximum} 이하여야 합니다.",
    duplicate: "동일한 {field} 값의 데이터가 이미 존재합니다.",
    referenceNotFound: "참조한 데이터를 찾을 수 없거나 비활성 상태입니다.",
    databaseError: "데이터베이스 제약 조건 때문에 데이터를 저장할 수 없습니다.",
  },
};

const interpolate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((result, [key, value]) => result.split(`{${key}}`).join(String(value)), template);

export function getApiLocale(req: Request): ApiLocale {
  const explicit = String(req.header("x-locale") ?? req.header("x-lang") ?? "").toLowerCase().split("-")[0];
  if (explicit === "id" || explicit === "ko" || explicit === "en") return explicit;
  const accepted = String(req.header("accept-language") ?? "").toLowerCase();
  if (accepted.startsWith("id")) return "id";
  if (accepted.startsWith("ko")) return "ko";
  return "en";
}

type ValidationIssue = { code: string; path: PropertyKey[]; message: string; input?: unknown; format?: string; values?: unknown[]; minimum?: unknown; maximum?: unknown; origin?: string };

function fieldName(issue: ValidationIssue): string {
  return issue.path.length ? issue.path.map(String).join(".") : "request";
}

function issueMessage(issue: ValidationIssue, locale: ApiLocale): string {
  const t = messages[locale];
  const field = fieldName(issue);
  if (issue.code === "invalid_type") {
    return interpolate(issue.input === undefined || issue.input === null || issue.input === "" ? t.required : t.invalidType, { field });
  }
  if (issue.code === "invalid_format") {
    const format = String((issue as { format?: string }).format ?? "");
    if (format === "email") return interpolate(t.invalidEmail, { field });
    if (format === "uuid") return interpolate(t.invalidUuid, { field });
    if (format === "date") return interpolate(t.invalidDate, { field });
  }
  if (issue.code === "invalid_value") {
    const values = (issue as { values?: unknown[] }).values ?? [];
    return interpolate(t.invalidEnum, { field, options: values.join(", ") });
  }
  if (issue.code === "too_small") {
    const minimum = String((issue as { minimum?: unknown }).minimum ?? "");
    const origin = String((issue as { origin?: string }).origin ?? "");
    return interpolate(origin === "number" ? t.tooSmallNumber : t.tooSmallString, { field, minimum });
  }
  if (issue.code === "too_big") {
    const maximum = String((issue as { maximum?: unknown }).maximum ?? "");
    const origin = String((issue as { origin?: string }).origin ?? "");
    return interpolate(origin === "number" ? t.tooBigNumber : t.tooBigString, { field, maximum });
  }
  if (issue.code === "custom" || issue.code === "invalid_format") return interpolate(t.invalidType, { field });
  return issue.message || interpolate(t.invalidType, { field });
}


type PostgresErrorInfo = {
  code?: string;
  message?: string;
  constraint?: string;
  detail?: string;
  schema?: string;
  table?: string;
  column?: string;
};

function postgresError(error: unknown): PostgresErrorInfo | undefined {
  let current: unknown = error;
  const visited = new Set<unknown>();

  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth += 1) {
    if (visited.has(current)) break;
    visited.add(current);

    const candidate = current as PostgresErrorInfo & { cause?: unknown };
    if (candidate.code && /^[0-9A-Z]{5}$/.test(String(candidate.code))) {
      return candidate;
    }
    current = candidate.cause;
  }

  return undefined;
}

function quoted(value?: string) {
  return value ? `"${value}"` : "";
}

function databaseMessage(locale: ApiLocale, pg: PostgresErrorInfo) {
  const table = pg.table ? ` ${quoted(pg.table)}` : "";
  const column = pg.column ? ` ${quoted(pg.column)}` : "";
  const constraint = pg.constraint ? ` (${pg.constraint})` : "";

  if (locale === "id") {
    switch (pg.code) {
      case "42703":
        return `Skema database belum sinkron. Kolom${column || " yang dibutuhkan"} pada tabel${table || " ERP"} tidak ditemukan. Jalankan "npm run migrate" pada erp-api lalu restart server.`;
      case "42P01":
        return `Skema database belum sinkron. Tabel${table || " yang dibutuhkan"} tidak ditemukan. Jalankan "npm run migrate" pada erp-api lalu restart server.`;
      case "23503":
        return `Referensi data tidak valid${constraint}. Data yang dipilih tidak ditemukan pada tabel referensi. ${pg.detail ?? ""}`.trim();
      case "23505":
        return `Data duplikat${constraint}. Nilai unik yang sama sudah tersimpan. ${pg.detail ?? ""}`.trim();
      case "23502":
        return `Field database${column || " wajib"} tidak boleh kosong. ${pg.detail ?? ""}`.trim();
      case "23514":
        return `Data melanggar aturan validasi database${constraint}. ${pg.detail ?? ""}`.trim();
      case "22P02":
        return `Format nilai yang dikirim tidak sesuai dengan tipe data database. ${pg.message ?? ""}`.trim();
      case "22001":
        return `Nilai yang dikirim terlalu panjang untuk kolom database${column}. ${pg.message ?? ""}`.trim();
      default:
        return `Database menolak transaksi (kode ${pg.code}${constraint}). ${pg.detail ?? pg.message ?? ""}`.trim();
    }
  }

  if (locale === "ko") {
    switch (pg.code) {
      case "42703":
        return `데이터베이스 스키마가 동기화되지 않았습니다. 테이블${table || " ERP"}에 필요한 컬럼${column || ""}이 없습니다. erp-api에서 "npm run migrate"를 실행한 후 서버를 재시작하세요.`;
      case "42P01":
        return `데이터베이스 스키마가 동기화되지 않았습니다. 필요한 테이블${table || ""}이 없습니다. erp-api에서 "npm run migrate"를 실행한 후 서버를 재시작하세요.`;
      case "23503":
        return `참조 데이터가 올바르지 않습니다${constraint}. 선택한 참조 데이터가 존재하지 않습니다. ${pg.detail ?? ""}`.trim();
      case "23505":
        return `중복 데이터입니다${constraint}. 동일한 고유 값이 이미 저장되어 있습니다. ${pg.detail ?? ""}`.trim();
      case "23502":
        return `데이터베이스 필드${column || ""}는 비워 둘 수 없습니다. ${pg.detail ?? ""}`.trim();
      case "23514":
        return `데이터가 데이터베이스 검증 규칙을 위반했습니다${constraint}. ${pg.detail ?? ""}`.trim();
      default:
        return `데이터베이스가 트랜잭션을 거부했습니다 (코드 ${pg.code}${constraint}). ${pg.detail ?? pg.message ?? ""}`.trim();
    }
  }

  switch (pg.code) {
    case "42703":
      return `Database schema is out of sync. Required column${column || ""} on table${table || " ERP"} does not exist. Run "npm run migrate" in erp-api and restart the server.`;
    case "42P01":
      return `Database schema is out of sync. Required table${table || ""} does not exist. Run "npm run migrate" in erp-api and restart the server.`;
    case "23503":
      return `Invalid data reference${constraint}. The selected referenced record does not exist. ${pg.detail ?? ""}`.trim();
    case "23505":
      return `Duplicate data${constraint}. The same unique value already exists. ${pg.detail ?? ""}`.trim();
    case "23502":
      return `Database field${column || ""} cannot be null. ${pg.detail ?? ""}`.trim();
    case "23514":
      return `The data violates a database validation rule${constraint}. ${pg.detail ?? ""}`.trim();
    case "22P02":
      return `A submitted value has an invalid database type/format. ${pg.message ?? ""}`.trim();
    case "22001":
      return `A submitted value is too long for database column${column}. ${pg.message ?? ""}`.trim();
    default:
      return `Database rejected the transaction (code ${pg.code}${constraint}). ${pg.detail ?? pg.message ?? ""}`.trim();
  }
}

export function sendApiError(req: Request, res: Response, error: unknown) {
  const locale = getApiLocale(req);
  const t = messages[locale];

  if (error instanceof z.ZodError) {
    const errors = error.issues.map((issue) => ({
      field: fieldName(issue as ValidationIssue),
      code: issue.code,
      message: issueMessage(issue as ValidationIssue, locale),
    }));
    return res.status(422).json({
      locale,
      code: "VALIDATION_ERROR",
      message: t.validationFailed,
      errors,
    });
  }

  const pg = postgresError(error);
  if (pg?.code) {
    // A missing table/column is a server schema problem, not invalid user input.
    const status =
      pg.code === "42703" || pg.code === "42P01"
        ? 500
        : pg.code === "23505"
          ? 409
          : pg.code === "23503"
            ? 409
            : 422;

    const response = {
      locale,
      code:
        pg.code === "42703" || pg.code === "42P01"
          ? "DATABASE_SCHEMA_MISMATCH"
          : pg.code === "23505"
            ? "DUPLICATE_RECORD"
            : pg.code === "23503"
              ? "REFERENCE_NOT_FOUND"
              : "DATABASE_CONSTRAINT",
      message: databaseMessage(locale, pg),
      database: {
        code: pg.code,
        constraint: pg.constraint ?? null,
        table: pg.table ?? null,
        column: pg.column ?? null,
        detail: pg.detail ?? null,
      },
    };

    console.error("[ERP database error]", {
      method: req.method,
      path: req.originalUrl,
      ...response.database,
      message: pg.message,
    });

    return res.status(status).json(response);
  }

  const message = error instanceof Error && error.message ? error.message : t.invalidRequest;
  return res.status(400).json({ locale, code: "INVALID_REQUEST", message });
}
