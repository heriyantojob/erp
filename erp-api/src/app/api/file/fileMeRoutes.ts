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
import {
  listFilePublic, // Renamed from listTemplatePublic
  listFileUser, // Renamed from listTemplateUser
} from "./controllers/fileListPublicController"; // Changed file path from templateReadPublicController to fileReadPublicController
import {
  readFilePrivate, // Renamed from readTemplatePrivate
} from "./controllers/fileListPrivateController"; // Changed file path from templateReadPrivateController to fileReadPrivateController
import {
  viewFilePrivate, // Renamed from readTemplatePrivate
} from "./controllers/fileViewPrivateController";

import {
  viewFilePublic, // Renamed from readTemplatePrivate
} from "./controllers/fileViewPublicController";
import {
  deleteFile, // Renamed from deleteTemplate
} from "./controllers/fileDeleteController"; // Changed file path from templateDeleteController to fileDeleteController
import {
  addFile, // Renamed from addFileTemplate
  addProjectFile, // Renamed from addProjectTemplate
} from "./controllers/fileAddController"; // Changed file path from templateAddController to fileAddController
import { createFileProjectController } from "./controllers/projectController";
import { validateFileUpdate } from "./validation/fileValidationUpdate";
validateFileAddFile;

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
  createFileProjectController, // Changed from addProjectTemplate
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

fileRouter.get("/", readFilePrivate); // Changed from readTemplatePrivate

fileRouter.get("/:id", viewFilePrivate);

fileRouter.delete("/:id", deleteFile); // Changed from deleteTemplate

fileRouter.post(
  "/media",
  authUserMiddleware,
  upload.single("file"),
  validateFileAddFile,
  addFile, // Changed from addFileTemplate
);

fileRouter.post("/project", authUserMiddleware, createFileProjectController);

export default fileRouter; // Renamed from templateRouter
