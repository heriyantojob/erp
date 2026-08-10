import { nullable, z, ZodError } from "zod";
import { user, dbTableFiles } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/setup";
import { tableFiles } from "@/db/table/tableFiles";
import { title } from "process";
import slug from "slug";
import { fileRepository } from "../repositories/file.repository";

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
  }
  return false;
};

// Middleware untuk validasi
export const validateFileAddFile = async (req: any, res: any, next: any) => {
  let userAuth = res.locals;
  if (userAuth?.user?.contributor !== 1) {
    return res.status(404).json({ message: "You are not Contributor" });
  }
  try {
    const fileSchema = z.object({
      title: z.string(),
      description: z.string().nullable(),
      status: z.union([z.string(), z.number()]),
      link: z.string().refine(
        async (value) => {
          if (!value?.trim()) {
            return true;
          }

          let slugLink = value ? slug(value) : null;
          if (slugLink) {
            const fileinUse = await fileRepository.findBySlug(slugLink);
            if (!fileinUse) {
              return true;
            }
          }
        },
        {
          message: "Link already in use",
        },
      ),
      isAi: z.preprocess((val) => toBoolean(val), z.boolean()).default(false),
    });
    // Lakukan parse dengan skema yang telah dibuat
    await fileSchema.parseAsync(req.body);
    next();
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        message:
          "validation error occurred. please check indicated fields and submit again",
        errorList: e.issues,
      });
    } else {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  //return res.status(400).json({message:"validation error occurred. please check indicated fields and subtmit again"});
};
