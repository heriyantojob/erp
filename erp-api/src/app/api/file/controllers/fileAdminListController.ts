import { Response, Request, NextFunction } from "express";
import { listAdminFilesService } from "../service/fileService";

let page = 0;
let perPage = 5;

// Maps ?status= query value to the stored smallint.
// 0 = draft, 1 = publish, 2 = review, 3 = reject. "all" / omitted = no filter.
const STATUS_MAP: Record<string, number> = {
  draft: 0,
  publish: 1,
  published: 1,
  review: 2,
  reject: 3,
  rejected: 3,
};

function resolveStatusParam(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim().toLowerCase();
  if (!value || value === "all") return null;
  if (value in STATUS_MAP) return STATUS_MAP[value] ?? null;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 3) return numeric;
  return null;
}

export async function readFileAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userAuth = res.locals;
  if (!userAuth?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const pageParams = parseInt(req.query.page as string);
  const perPageParams = parseInt(req.query.per_page as string);
  const statusParams = resolveStatusParam(req.query.status);
  const moduleTypeParams = (req.query.module_type as string) || null;
  const qParam = req.query.q ? req.query.q : "";
  const typeParam = req.query.type || "";

  if (pageParams && pageParams > 0) {
    page = pageParams - 1;
  }
  if (perPageParams) {
    perPage = perPageParams;
  }

  try {
    const { items, total, totalPages } = await listAdminFilesService({
      page,
      perPage,
      q: qParam as string,
      type: typeParam as string,
      status: statusParams,
      moduleType: moduleTypeParams,
    });

    if (!items?.length) {
      return res.status(404).json({ message: "No data found" });
    }
    return res.status(200).json({ items, total, totalPages });
  } catch (e) {
    return res.status(500).json({
      message:
        "We're sorry, something went wrong on our end. Please try refreshing the page.",
    });
  }
}
