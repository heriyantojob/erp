import { z, ZodError } from "zod";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/db/setup";
const userSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      async (email) => {
        const foundUser = await db.query.user.findFirst({
          where: eq(user.email, email),
        });
        // const user = await UserCollection.findUserByEmail(value);
        if (!foundUser) {
          return true;
        }
      },
      {
        message: "E-mail already in use",
      },
    ),
  username: z
    .string()
    .min(2, "Username must be at least 3 characters long")
    .refine(
      async (value) => {
        const foundUser = await db.query.user.findFirst({
          where: eq(user.username, value),
        });
        // const user = await UserCollection.findUserByEmail(value);

        if (!foundUser) {
          return true;
          // throw new Error('Username already in use');
        }
      },
      {
        message: "Username already in use",
      },
    )
    .nullable(),

  // adminType: z.number().refine(async (value,) => {
  //  // res.locals
  // } , {
  //   message: "Username already in use",
  // })
});

// Middleware untuk validasi
export const validateUser = async (req: any, res: any, next: any) => {
  try {
    // Lakukan parse dengan skema yang telah dibuat
    await userSchema.parseAsync(req.body);
    next();
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({
        message:
          "validation error occurred. please check indicated fields and subtmit again",
        errorList: e.issues,
      });
    } else {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};
