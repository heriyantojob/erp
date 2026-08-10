import { db } from "@/db/setup";
import {
  and,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { user } from "@/db/schema";
import { tableFiles, tableFileAttachments } from "@/db/table/tableFiles";
import logger from "@/utils/logger";

export interface ListParams {
  page: number; // zero-based
  perPage: number;
  q?: string;
  type?: string;
}
export interface PublicListParams extends ListParams {
  moduleType?: string | null;
}

export interface PrivateListParams extends ListParams {
  userId: string;
  moduleType?: string | null;
}

export interface AdminListParams extends ListParams {
  // 0 = draft, 1 = publish, 2 = review, 3 = reject. Omit/undefined = all statuses
  status?: number | null;
  moduleType?: string | null;
}
interface AttachmentsByFileParams {
  idFile: string;
  inPreview?: number;
  inPreviewHd?: number;
  inDownload?: number;
}

export class FileRepository {
  async countPublic(
    params: Omit<PublicListParams, "page" | "perPage">,
  ): Promise<number> {
    const whereSQL: SQL[] = [
      eq(tableFiles.status, 1),
      isNotNull(tableFiles.slug),
    ];
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    if (params?.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    const result = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tableFiles)
      .where(and(...whereSQL));
    return (result?.[0]?.total as number) || 0;
  }

  async findPublic(params: PublicListParams) {
    const whereSQL: SQL[] = [
      eq(tableFiles.status, 1),
      isNotNull(tableFiles.slug),
    ];
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    if (params?.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    const rows = (await db
      .select({
        id: tableFiles.id,
        title: tableFiles.title,
        slug: tableFiles.slug,
        description: tableFiles.description,
        status: tableFiles.status,
        module_type: tableFiles.moduleType,
        fileType: tableFiles.fileType,
        isAi: tableFiles.isAi,
        tags: tableFiles.tags,
        createdAt: tableFiles.createdAt,
        updated_at: tableFiles.updatedAt,
        user: {
          uid: user.uid,
          username: user.username,
          name: user.name,
          image: user.image,
        },
      })
      .from(tableFiles)
      .where(and(...whereSQL))
      .leftJoin(user, eq(tableFiles.owner, user.id))
      .limit(params.perPage)
      .offset(params.page * params.perPage)
      .orderBy(desc(tableFiles.updatedAt))) as any[];
    return rows;
  }

  async countPrivate(
    params: Omit<PrivateListParams, "page" | "perPage">,
  ): Promise<number> {
    const whereSQL: SQL[] = [eq(tableFiles.owner, params.userId)];
    if (typeof params.moduleType === "string" && params.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    const result = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tableFiles)
      .where(and(...whereSQL));
    return (result?.[0]?.total as number) || 0;
  }

  async findPrivate(params: PrivateListParams) {
    const whereSQL: SQL[] = [eq(tableFiles.owner, params.userId)];
    if (params?.moduleType) {
      if (typeof params.moduleType === "string") {
        whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
      }
    }
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    if (params?.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    const rows = (await db
      .select()
      .from(tableFiles)
      .where(and(...whereSQL))
      .limit(params.perPage)
      .offset(params.page * params.perPage)
      .orderBy(desc(tableFiles.createdAt))) as any[];
    return rows;
  }

  async countAdmin(
    params: Omit<AdminListParams, "page" | "perPage">,
  ): Promise<number> {
    const whereSQL: SQL[] = [];
    // 0 = draft, 1 = publish, 2 = review, 3 = reject. No status param = all statuses
    if (typeof params.status === "number") {
      whereSQL.push(eq(tableFiles.status, params.status));
    }
    if (typeof params.moduleType === "string" && params.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    const result = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tableFiles)
      .where(whereSQL.length ? and(...whereSQL) : undefined);
    return (result?.[0]?.total as number) || 0;
  }

  async findAdmin(params: AdminListParams) {
    const whereSQL: SQL[] = [];
    if (typeof params.status === "number") {
      whereSQL.push(eq(tableFiles.status, params.status));
    }
    if (typeof params.moduleType === "string" && params.moduleType) {
      whereSQL.push(eq(tableFiles.moduleType, params.moduleType));
    }
    if (params?.q) {
      const q = `%${params.q}%`;
      whereSQL.push(
        or(
          ilike(tableFiles.title as any, q),
          ilike(sql`${tableFiles.tags}::text`, q),
        )!,
      );
    }
    if (params?.type) {
      whereSQL.push(eq(tableFiles.fileType, params.type));
    }
    const rows = (await db
      .select({
        id: tableFiles.id,
        owner: tableFiles.owner,
        title: tableFiles.title,
        description: tableFiles.description,
        status: tableFiles.status,
        module_type: tableFiles.moduleType,
        fileType: tableFiles.fileType,
        isAi: tableFiles.isAi,
        slug: tableFiles.slug,
        tags: tableFiles.tags,
        createdAt: tableFiles.createdAt,
        updatedAt: tableFiles.updatedAt,
        user: {
          uid: user.uid,
          username: user.username,
          name: user.name,
          image: user.image,
        },
      })
      .from(tableFiles)
      .where(whereSQL.length ? and(...whereSQL) : undefined)
      .leftJoin(user, eq(tableFiles.owner, user.id))
      .limit(params.perPage)
      .offset(params.page * params.perPage)
      .orderBy(desc(tableFiles.createdAt))) as any[];
    return rows;
  }

  async findByIdAdmin(id: string) {
    // const rows = await db
    //   .select({
    //     id: tableFiles.id,
    //     owner: tableFiles.owner,
    //     title: tableFiles.title,
    //     description: tableFiles.description,
    //     status: tableFiles.status,
    //     module_type: tableFiles.moduleType,
    //     fileType: tableFiles.fileType,
    //     isAi: tableFiles.isAi,
    //     created_at: tableFiles.createdAt,
    //     updated_at: tableFiles.updatedAt,
    //     slug: tableFiles.slug,
    //     tags: tableFiles.tags,
    //   })
    //   .from(tableFiles)
    //   .where(eq(tableFiles.id, id)) as any[];
    // return rows?.[0] || null;

    const rows = await db
      .select({
        id: tableFiles.id,
        owner: tableFiles.owner,
        title: tableFiles.title,
        description: tableFiles.description,
        status: tableFiles.status,
        module_type: tableFiles.moduleType,
        fileType: tableFiles.fileType,
        isAi: tableFiles.isAi,
        created_at: tableFiles.createdAt,
        updated_at: tableFiles.updatedAt,
        slug: tableFiles.slug,
        tags: tableFiles.tags,

        // file_attachments: {
        //   ...tableFileAttachments,
        // },
      })
      .from(tableFiles)

      .where(and(eq(tableFiles.id, id), isNull(tableFiles.deletedAt)));
    return rows?.[0] || null;
  }

  async findBySlugPublic(slug: string) {
    const rows = (await db
      .select({
        id: tableFiles.id,
        title: tableFiles.title,
        tags: tableFiles.tags,
        description: tableFiles.description,
        status: tableFiles.status,
        module_type: tableFiles.moduleType,
        fileType: tableFiles.fileType,
        isAi: tableFiles.isAi,
        created_at: tableFiles.createdAt,
        updated_at: tableFiles.updatedAt,
        slug: tableFiles.slug,
        owner: tableFiles.owner,
        user: {
          uid: user.uid,
          username: user.username,
          name: user.name,
          image: user.image,
        },
      })
      .from(tableFiles)
      .leftJoin(user, eq(tableFiles.owner, user.id))
      .where(
        and(eq(tableFiles.slug, slug), isNull(tableFiles.deletedAt)),
      )) as any[];
    return rows?.[0] || null;
  }

  async findBySlug(slugValue: string) {
    const rows = await db
      .select({ id: tableFiles.id, slug: tableFiles.slug })
      .from(tableFiles)
      .where(and(eq(tableFiles.slug, slugValue), isNull(tableFiles.deletedAt)));
    return rows?.[0] || null;
  }

  async countBySlug(slugValue: string) {
    const rows = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(tableFiles)
      .where(and(eq(tableFiles.slug, slugValue), isNull(tableFiles.deletedAt)));
    return (rows?.[0]?.total as number) || 0;
  }

  async findByIdForUser(id: string, userId: string) {
    const rows = (await db
      .select({
        id: tableFiles.id,
        title: tableFiles.title,
        description: tableFiles.description,
        status: tableFiles.status,
        module_type: tableFiles.moduleType,
        fileType: tableFiles.fileType,
        isAi: tableFiles.isAi,
        created_at: tableFiles.createdAt,
        updated_at: tableFiles.updatedAt,
        slug: tableFiles.slug,
        owner: tableFiles.owner,
        tags: tableFiles.tags,
      })
      .from(tableFiles)
      .where(
        and(
          eq(tableFiles.id, id),
          eq(tableFiles.owner, userId),
          isNull(tableFiles.deletedAt),
        ),
      )) as any[];
    // .where(and(eq(tableFiles.id, id))) as any[];
    return rows?.[0] || null;
  }

  async findById(id: string) {
    const rows = await db
      .select()
      .from(tableFiles)
      .where(and(eq(tableFiles.id, id), isNull(tableFiles.deletedAt)));
    return rows?.[0] || null;
  }

  async attachmentsByFileAll(idFile: string) {
    const rows = await db
      .select()
      .from(tableFileAttachments)
      .where(
        and(
          eq(tableFileAttachments.idFile, idFile),
          isNull(tableFileAttachments.deletedAt),
        ),
      );
    return rows as any[];
  }

  async attachmentsByFile(
    idFile: string,
    inPreview: number,
    inDownload: number,
  ) {
    const rows = await db
      .select()
      .from(tableFileAttachments)
      .where(
        and(
          eq(tableFileAttachments.idFile, idFile),
          eq(tableFileAttachments.inPreview, inPreview),

          eq(tableFileAttachments.inDownload, inDownload),
          isNull(tableFileAttachments.deletedAt),
        ),
      );
    return rows as any[];
  }

  async updateFileById(
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      status: number | string;
      slug: string | null;
      tags: any;
    }>,
  ) {
    await db
      .update(tableFiles)
      .set({
        title: data.title as any,
        description: data.description as any,
        status: data.status as any,
        slug: data.slug as any,
        tags: data.tags as any,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(tableFiles.id, id), isNull(tableFiles.deletedAt)));
  }

  async deleteAttachmentsByFile(idFile: string) {
    await db
      .update(tableFileAttachments)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(tableFileAttachments.idFile, idFile),
          isNull(tableFileAttachments.deletedAt),
        ),
      );
  }

  async deleteFileById(id: string) {
    await db
      .update(tableFiles)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(tableFiles.id, id), isNull(tableFiles.deletedAt)));
  }

  async insertAttachments(values: any[]) {
    if (!values?.length) return;
    await db.insert(tableFileAttachments).values(values);
  }

  async insertAttachment(value: any) {
    await db.insert(tableFileAttachments).values(value);
  }

  async insertFile(value: any) {
    await db.insert(tableFiles).values(value);
  }
}

export const fileRepository = new FileRepository();
