import { user } from "@/db/schema";
import { db } from "@/db/setup";
import { eq } from "drizzle-orm";
import { body } from "express-validator";
import { Request, Response, NextFunction } from "express";
export function validateEmailBody() {
  return body("email").custom(async (value) => {
    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, value),
    });
    // const user = await UserCollection.findUserByEmail(value);
    if (foundUser) {
      throw new Error("E-mail already in use");
    }
  });
  // body("body").notEmpty().isString().trim().escape();
}

export function validateAdminTypeBody() {
  return body("adminType").custom(async (value, { req }) => {
    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, value),
    });
    // const user = await UserCollection.findUserByEmail(value);
    if (foundUser) {
      throw new Error("E-mail already in use");
    }
  });
  // body("body").notEmpty().isString().trim().escape();
}

export function validateUsernameBody() {
  return body("username").custom(async (value) => {
    const foundUser = await db.query.user.findFirst({
      where: eq(user.username, value),
    });
    // const user = await UserCollection.findUserByEmail(value);
    if (foundUser) {
      throw new Error("Username already in use");
    }
  });
  // body("body").notEmpty().isString().trim().escape();
}
