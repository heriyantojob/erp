import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/lib/better-auth/auth";
import authUserMiddleware from "@/middleware/auth/authUserMiddleware";
import publicFilesRouter from "@/app/api/file/fileRoutes";
import myFilesRouter from "@/app/api/file/fileMeRoutes";
import erpRouter from "@/app/api/erp/erpRoutes";
import stockRouter from "@/app/api/erp/stockRoutes";
import processRouter from "@/app/api/erp/processRoutes";

const router = Router();

router.use(async (req, res, next) => {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  res.locals.session = result?.session ?? null;
  res.locals.user = result?.user ?? null;
  next();
});

router.get("/me", authUserMiddleware, (_req, res) => res.json({ user: res.locals.user }));

function mountErp(basePath: string) {
  router.get(`${basePath}/_diagnostic`, authUserMiddleware, (req, res) =>
    res.json({
      status: "ok",
      message: "ERP router is mounted.",
      basePath,
      method: req.method,
      path: req.originalUrl,
    }),
  );
  router.use(basePath, authUserMiddleware, erpRouter);
  router.use(basePath, authUserMiddleware, stockRouter);
  router.use(basePath, authUserMiddleware, processRouter);
}

// Canonical ERP API path used by the Next.js frontend.
mountErp("/api/erp");

// Backward-compatible alias for older Postman collections / integrations.
mountErp("/erp");

router.use("/files/me", authUserMiddleware, myFilesRouter);
router.use("/files", publicFilesRouter);

export default router;
