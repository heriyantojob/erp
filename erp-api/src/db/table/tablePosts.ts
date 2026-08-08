import { pgTable, serial, varchar, text, integer, timestamp,smallint } from "drizzle-orm/pg-core";

// Tabel utama posts
export const tablePosts = pgTable("posts", {
  id: serial("id").primaryKey(),
  // post_type dengan default 'post'
  post_type: varchar("post_type", { length: 50 }).default('post').notNull(),

  feature_image: varchar("feature_image", { length: 512 }), // URL atau path image utama
  feature_image_thumbnail: varchar("feature_image_thumbnail", { length: 512 }), // URL thumbnail 420px
  publish_at: timestamp("publish_at"), // tanggal dan jam publish
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
    status: smallint("status").default(0).notNull(),
});

// Tabel terjemahan per bahasa dengan slug SEO-friendly
export const tablePostlocales = pgTable("post_locales", {
  id: serial("id").primaryKey(),
  post_id: integer("post_id")
    .notNull()
    .references(() => tablePosts.id, { onDelete: "cascade" }),
  _locale: varchar("_locale", { length: 10 }).notNull(), // misal: 'en', 'id'
  slug: varchar("slug", { length: 255 }).notNull().unique(), // SEO-friendly per bahasa
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  meta_title: varchar("meta_title", { length: 255 }),
  meta_description: text("meta_description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Index unik untuk menghindari duplikasi slug per bahasa
// post_locales.index("post_locale_slug_unique", ["_locale", "slug"], { unique: true });