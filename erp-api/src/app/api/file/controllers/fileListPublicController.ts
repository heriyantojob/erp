import { Response, Request, NextFunction } from "express";
import { listPublicFilesService } from "../service/fileService";
import { fileRepository } from "../repositories/file.repository";

const DEFAULT_PAGE = 0;
const DEFAULT_PER_PAGE = 5;

export async function listFilePublic(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const pageParam = parseInt(String(req.query.page || `${DEFAULT_PAGE}`));
  const perPageParam = parseInt(
    String(req.query.per_page || `${DEFAULT_PER_PAGE}`),
  );
  const rawQ = Array.isArray(req.query.q) ? req.query.q.join(" ") : req.query.q;
  const qParam = typeof rawQ === "string" ? rawQ.trim() : "";
  const rawType = Array.isArray(req.query.type)
    ? req.query.type[0]
    : req.query.type;
  const typeParam = typeof rawType === "string" ? rawType.trim() : "";
  const moduleTypeParams = (req.query.module_type as string) || null;
  const page = pageParam > 0 ? pageParam - 1 : DEFAULT_PAGE;
  const perPage = perPageParam;

  try {
    const { items, total, totalPages } = await listPublicFilesService({
      page,
      perPage,
      q: qParam as string,
      type: typeParam as string,
      moduleType: moduleTypeParams as string,
    });
    if (!items?.length) {
      return res.status(404).json({ message: "Not Found" });
    }
    return res.status(200).json({ items, total, totalPages });
  } catch (error) {
    return res.status(500).json({
      message:
        "We're sorry, something went wrong on our end. Please try refreshing the page.",
    });
  }
}

export async function listFileUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Changed to listFileUser
  return res.status(200).json({ message: "File List User" });
}

export async function listFileSitemapController(req: Request, res: Response) {
  const pageParam = parseInt(String(req.query.page || "1"));
  const perPageParam = parseInt(
    String(req.query.per_page || req.query.perPage || "5000"),
  );
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const perPage =
    Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : 5000;

  try {
    const total = await fileRepository.countPublic({});
    const totalPages = Math.ceil(total / perPage);

    const items = await fileRepository.findPublic({
      page: page - 1,
      perPage,
      q: req.query.q as string,
      type: req.query.type as string,
      moduleType: req.query.moduleType as string | null,
    });

    if (!items.length) {
      return res.status(404).json({ message: "No data found" });
    }

    return res.status(200).json({
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        fileType: item.fileType,
        updated_at: item.updated_at,
        created_at: item.createdAt,
      })),
      total,
      totalPages,
      page,
      perPage,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
  }
}

// Define the main interface for files with user information
export interface TableFileWithUserType {
  // Updated from TableTemplateWithUserType to TableFileWithUserType
  id: string; // 36-character UUID string
  owner: string; // Owner with a max length of 255 characters
  title?: string; // Title, max length 255 characters
  description?: string; // Text description
  fileType: string; // Required file type, max length 20 characters
  moduleType: string; // Module type: file | template | file | ebook
  status?: number; // Tinyint for status, defaults to 1
  slug?: string; // Unique slug, max length 255 characters
  tags?: Record<string, any>; // JSON field for tags
  createdAt: string; // Timestamp for created_at, as a string
  updatedAt?: string; // Timestamp for updated_at, as a string
  deletedAt?: string; // Timestamp for deleted_at, as a string (optional)
  user: {
    username: string; // Username from the users table
    name: string; // Name from the users table
    image: string; // Image from the users table
  } | null;
  filePreview?: any | null; // URL or data for file preview
  fileDownload?: any | null; // URL or data for file download
}

/*
  query param
  type = fileType
  q = search

*/
