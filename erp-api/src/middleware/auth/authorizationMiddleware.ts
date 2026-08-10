import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@/db/setup";
import { permissions, rolePermissions, userRoles } from "@/db/schema";

/**
 * ERP permissions are deliberately deny-by-default. The Better Auth admin
 * role remains an emergency/bootstrap administrator; all other users receive
 * their access through the flexible user_roles tables.
 */
export function requireAnyPermission(...required: string[]) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = res.locals.user as
        | { id?: string; role?: string }
        | undefined;
      if (!currentUser?.id)
        return res.status(401).json({ message: "Unauthorized" });

      if (["admin", "superadmin"].includes(currentUser.role ?? ""))
        return next();

      const granted = await db
        .select({ code: permissions.code })
        .from(userRoles)
        .innerJoin(
          rolePermissions,
          eq(rolePermissions.roleId, userRoles.roleId),
        )
        .innerJoin(
          permissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(eq(userRoles.userId, currentUser.id));

      if (!granted.some(({ code }) => required.includes(code))) {
        return res.status(403).json({
          message:
            "Forbidden: your role does not have the required permission.",
          required,
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export async function getCurrentPermissions(
  userId: string,
  fallbackRole?: string,
) {
  if (["admin", "superadmin"].includes(fallbackRole ?? "")) return ["*"];
  const rows = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));
  return [...new Set(rows.map((row) => row.code))];
}
