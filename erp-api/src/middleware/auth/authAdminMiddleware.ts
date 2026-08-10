import { Request, Response, NextFunction } from "express";

export const authAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = res.locals.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // if ( user.accessLevel < 1) {
  //     return res.status(403).json({ message: 'Forbidden: Admins only' });
  // }
  if (!["admin", "superadmin"].includes(user.role)) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }

  next();
};

export default authAdminMiddleware;
