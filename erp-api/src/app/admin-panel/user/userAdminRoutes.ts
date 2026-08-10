import { Router } from "express";
import { v7 as uuid } from "uuid";
import multer from "multer";
import {
  addUser,
  listUser,
  viewUser,
  updateUser,
  uploadUser,
} from "./userAdminController";

import { body } from "express-validator";
import { db } from "@/db/setup";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  validateEmailBody,
  validateUsernameBody,
  validateAdminTypeBody,
} from "./userAdminValidation";
import { validateUser } from "./userAdminValidationInsert";
import { validateUserUpdate } from "./userAdminValidationUpdate";
//const upload = multer({ dest: 'uploads/' });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit file size to 5MB
  },
});
const userCmsRouter = Router();
userCmsRouter.post("/", validateUser, addUser);
userCmsRouter.get("/", listUser);
userCmsRouter.get("/:id", viewUser);

userCmsRouter.put(
  "/:id",
  validateUserUpdate,

  updateUser,
);

userCmsRouter.put("/upload/:id", upload.single("file"), uploadUser);

export default userCmsRouter;
