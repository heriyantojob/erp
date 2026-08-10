import { Response, Request, NextFunction } from "express";
import { listPrivateFilesService } from "../service/fileService";

let page = 0;
let perPage = 5;

export async function readFilePrivate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userAuth = res.locals;

  const pageParams = parseInt(req.query.page as string);
  const perPageParams = parseInt(req.query.per_page as string);
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
    const { items, total, totalPages } = await listPrivateFilesService({
      userId: userAuth.user.id,
      page,
      perPage,
      q: qParam as string,
      type: typeParam as string,
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

// Define the main interface for file with user information
export interface TableFileWithUserType {
  // Changed interface name from TableTemplateWithUserType to TableFileWithUserType
  id: string; // 36-character UUID string
  owner: string; // Owner with a max length of 255 characters
  title?: string; // Title, max length 255 characters
  description?: string; // Text description
  fileType: string; // Required file type, max length 20 characters
  moduleType: string; // Module type: file | template | file | ebook
  status?: number; // Tinyint for status, defaults to 1
  isAi?: number | boolean; // Flag to indicate if the asset is AI generated
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
