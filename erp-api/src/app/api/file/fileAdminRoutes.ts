import { Router } from "express";
import { v7 as uuid } from "uuid";

import {
  updateFile,
  // Renamed from listTemplatePublic  // Renamed from listTemplateUser
} from "./controllers/fileUpdateController";
import {
  updateFileDesign,
  // Renamed from listTemplatePublic  // Renamed from listTemplateUser
} from "./controllers/fileUpdateDesignController";
import { readFileAdmin } from "./controllers/fileAdminListController";
import { viewFileAdmin } from "./controllers/fileAdminViewController";

import {
  deleteFile,
  deleteFileAdmin, // Renamed from deleteTemplate
} from "./controllers/fileDeleteController"; // Changed file path from templateDeleteController to fileDeleteController
import {
  addFile, // Renamed from addFileTemplate
  addProjectFile, // Renamed from addProjectTemplate
} from "./controllers/fileAddController"; // Changed file path from templateAddController to fileAddController
import { createFileProjectController } from "./controllers/projectController";
import { validateFileUpdate } from "./validation/fileValidationUpdate";

import { validateFileAddFile } from "./validation/fileValidationAddFile";
// import {
//     viewFilePublic,

//   } from "./fileViewPrivateController.ts";
import multer from "multer";
import authUserMiddleware from "@/middleware/auth/authUserMiddleware";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1000 * 1024 * 1024, // limit file size to 5MB
  },
});

const fileRouter = Router(); // Renamed from templateRouter

fileRouter.post(
  "/add-file",
  authUserMiddleware,
  upload.single("file"),
  validateFileAddFile,
  addFile, // Changed from addFileTemplate
);

fileRouter.post(
  "/add-design",
  upload.single("file"),
  addProjectFile, // Changed from addProjectTemplate
);

fileRouter.put(
  "/update-file/:id",
  authUserMiddleware,
  validateFileUpdate,

  updateFile, // Changed from addProjectTemplate
);
fileRouter.put(
  "/update-design/:id",
  authUserMiddleware,
  updateFileDesign, // Changed from addProjectTemplate
);

fileRouter.get("/", authUserMiddleware, readFileAdmin); // Admin list — filter by ?status=draft|publish|review|reject (omit/"all" = no filter)

fileRouter.get("/:id", authUserMiddleware, viewFileAdmin); // Admin view — not restricted to the record owner

fileRouter.delete("/:id", deleteFileAdmin); // Changed from deleteTemplate

fileRouter.post(
  "/media",
  authUserMiddleware,
  upload.single("file"),
  validateFileAddFile,
  addFile, // Changed from addFileTemplate
);

fileRouter.post("/project", authUserMiddleware, createFileProjectController);

export default fileRouter; // Renamed from templateRouter
