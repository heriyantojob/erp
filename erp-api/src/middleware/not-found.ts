import { Response, Request, NextFunction } from "express";
import { CustomError } from "../lib/custom-error";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  return next(
    new CustomError(
      `Endpoint not found: ${req.method} ${req.originalUrl}. Expected ERP endpoints under /api/erp/* (or legacy /erp/*).`,
      404,
    ),
  );
}
