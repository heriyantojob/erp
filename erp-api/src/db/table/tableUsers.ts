import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { nameTableUserSessions } from "../tableName";

// dotenv.config({ path: "./.env.local" });
//let prefix =process.env.DB_PREFIX
let prefix = "";
// let prefix = "bos_"
// let nameTableUser = prefix+"users"
// export let nameTableUser = prefix+"users"
export let nameTableUser = "user";
export const tableUser = pgTable(nameTableUser, {
  // id: text('id').primaryKey().default(sql`(uuid())`),
  // id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  id: text("id").primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).notNull().unique(),
  // emailVerified: timestamp("email_verified", { mode: "date" }),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),

  image: text("image"),
  username: varchar("username", { length: 256 }).unique(),
  password: varchar("password", { length: 256 }),
  about: varchar("about", { length: 500 }),
  phone: varchar("phone", { length: 30 }),
  user_verified: smallint("user_verified"),

  //0 not active 1 active 2 block
  uid: varchar("uid", { length: 255 }).default(sql`gen_random_uuid()`),

  // accessLevel: smallint("access_level").default(0),
  //0 user ; 1 admin 2 super admin
  contributor: smallint("contributor").default(0),

  //createdAt: timestamp('created_at',{ mode: 'date' }).default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),

  role: varchar("role", { length: 50 }).default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { mode: "date" }),
});

export const tableUserInvites = pgTable("user_invites", {
  // idUser: uuid('id_user').primaryKey().default(sql`gen_random_uuid()`),
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 256 }).notNull().unique(),

  created_at: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const tableUserFiles = pgTable(prefix + "user_files", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  owner: varchar("owner", { length: 255 }).notNull(),
  ownerTransfer: varchar("owner_transfer", { length: 255 }),
  idUserFolder: varchar("id_user_folder", { length: 255 }),
  title: varchar("title", { length: 255 }).default(""),
  caption: text("caption"), // ƒ+? nullable
  description: text("description"),
  tags: jsonb("tags"),
  file_type: varchar("file_type", { length: 20 }).notNull(),
  //0 media,1 project
  project_type: smallint("project_type").default(0).notNull(),
  //project   | file
  moduleType: varchar("module_type", { length: 30 }).notNull().default("file"),

  status: smallint("status").default(0),

  //0 public 1 private
  visibility: smallint("visibility").default(0),

  supporters: bigint("supporters", { mode: "number" }).default(0).notNull(), // jumlah pendukung / pengguna twibbon

  slug: varchar("slug", { length: 255 }).unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});
export const tableUserFileAttachments = pgTable(
  prefix + "user_file_attachments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    fileName: varchar("file_name", { length: 255 }),
    filePath: varchar("file_path", { length: 255 }),
    fileExt: varchar("file_ext", { length: 255 }),
    fileMime: varchar("file_mime", { length: 255 }),
    fileList: jsonb("file_list"),
    fileSize: integer("file_size"),
    fileWidth: integer("file_width"),
    fileHeight: integer("file_height"),

    inPreview: smallint("in_preview").default(0),
    inDownload: smallint("in_download").default(0),
    isAdditionalFile: smallint("is_additional_file").default(0),
    idUserFile: varchar("id_user_file", { length: 36 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
);

export const tableUserFileSize = pgTable(prefix + "user_file_size", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  size: smallint("size"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
});

export const tableUserFileShares = pgTable(prefix + "user_file_share", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  idUser: varchar("user_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  idUserFile: varchar("id_user_file", { length: 255 }),
  shareType: smallint("share_type"), //0 owner 1 edit 2 view

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});

export const tableUserFolders = pgTable(prefix + "user_folders", {
  // id_user: serial("id_user").primaryKey(),
  // id_user: integer("id_user").primaryKey().autoincrement(),
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  parentFolderId: varchar("parent_folder_id", { length: 256 })
    .notNull()
    .unique(),
  folderName: varchar("name", { length: 256 }).notNull(),
  owner: varchar("owner", { length: 255 }).notNull(),
});

export const tableUserFolderShares = pgTable(prefix + "user_folder_share", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  idUserFolder: varchar("id_user_folder", { length: 255 }),
  email: varchar("email", { length: 255 }),
  shareType: smallint("share_type"), //1 owner 2 edit 3 view

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});
