import {
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  bigint
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const tableFiles = pgTable("files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  owner: varchar("owner", { length: 255 }).notNull(),
  ownerTransfer: varchar("owner_transfer", { length: 255 }),

  title: varchar("title", { length: 255 }),
  description: text("description"),

  fileType: varchar("file_type", { length: 20 }).notNull(),

  // Legacy assets are intentionally constrained to one module for the ERP migration.
  moduleType: varchar("module_type", { length: 30 }).notNull().default("file"),
  
  supporters: bigint("supporters", { mode: "number" })
    .default(0)
    .notNull(), // jumlah pendukung / pengguna twibbon
  // 0 = draft, 1 = publish, 2 = review, 3 = reject
  status: smallint("status").default(1),

  isAi: smallint("is_ai").default(0),
  isBgTransparent: smallint("is_bg_transparent").default(0),

  slug: varchar("slug", { length: 255 }).unique(),
  tags: jsonb("tags"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const tableFileAttachments = pgTable("file_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  idFile: varchar("id_file", { length: 36 }),

  fileName: varchar("file_name", { length: 255 }),
  filePath: varchar("file_path", { length: 255 }),
  fileExt: varchar("file_ext", { length: 255 }),
  fileMime: varchar("file_mime", { length: 255 }),

  fileList: jsonb("file_list"),
  fileSize: integer("file_size"),
  fileQuality: varchar("file_quality", { length: 20 }), // sd | hd | fhd | 4k | 8k | original

  fileWidth: integer("file_width"),
  fileHeight: integer("file_height"),

  inPreview: smallint("in_preview").default(0),
  inPreviewHd: smallint("in_preview_hd").default(0),
  inDownload: smallint("in_download").default(0),
  isAdditionalFile: smallint("is_additional_file").default(0),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});
