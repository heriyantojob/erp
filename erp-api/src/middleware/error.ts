import type { Request, Response, NextFunction } from "express";
import { CustomError } from "../lib/custom-error";
import { getApiLocale } from "../lib/api-i18n";

const genericMessage = {
  en: "Internal server error.",
  id: "Terjadi kesalahan pada server.",
  ko: "서버 내부 오류가 발생했습니다.",
} as const;

export function error(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const locale = getApiLocale(req);
  const candidate = err as Partial<CustomError> & {
    statusCode?: number;
    code?: string;
    message?: string;
  };
  const rawStatus = Number(candidate?.status ?? candidate?.statusCode ?? 500);
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : 500;
  let message = candidate?.message || genericMessage[locale];
  let details: unknown;

  try {
    const parsed = JSON.parse(message);
    details = parsed;
    if (
      typeof parsed === "object" &&
      parsed &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      message = parsed.message;
    }
  } catch {
    // Plain error messages are returned as-is for useful development feedback.
  }

  if (status >= 500) console.error("[ERP API] Unhandled error", err);
  return res.status(status).json({
    locale,
    code:
      candidate?.code ||
      (status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR"),
    message,
    ...(details !== undefined ? { details } : {}),
  });
}
