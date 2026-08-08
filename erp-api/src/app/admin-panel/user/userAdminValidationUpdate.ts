import { z, ZodError } from 'zod';
import { user } from "@/db/schema";
import { and, eq } from 'drizzle-orm';
import { db } from "@/db/setup";


// Middleware untuk validasi
export const validateUserUpdate = async (req: any, res: any, next: any) => {
 //check use exist
  let dataUserExist =null
  try {
    const resultUserExist = await db.query.user.findFirst({
      where: eq(user.id, req.params.id),
      columns: {
        email: true,
        username:true,
        name: true,
      }
    });
    if(!resultUserExist){
      return res.status(404).json({ message: "User Not Found" });
    }
    dataUserExist=resultUserExist
  } catch (error) {
    return res.status(404).json({ message: "update failed" });
  }


 

    try {

      const userSchema = z.object({
        email: z.string().email("Invalid email address")
        .refine(async (email) => {
          if(dataUserExist.email==email){
            return true
          }
          
          const foundUser = await db.query.user.findFirst({
            where: and(eq(user.email, email)),
            columns: {
              id: true
            }
          });
        // const user = await UserCollection.findUserByEmail(value);
          if (!foundUser ) {
            return true;
          }else{
            // if(user.id== req.params.id) {
            //   return true;
            // }
          }
        } , {
          message: "E-mail already in use" ,
        }),
        username: z.string()
        .min(2, 
          "Username must be at least 3 characters long")
          .refine(async (value) => {
            if(dataUserExist.username==value){
              return true
            }
              const foundUser = await db.query.user.findFirst({
                where: eq(user.username, value)
              });
            // const user = await UserCollection.findUserByEmail(value);
            
              if (!foundUser) {
                return true;
              // throw new Error('Username already in use');
              
              }
          
          
          } , {
            message: "Username already in use",
          })
          .nullable(),
        
        
      });
      // Lakukan parse dengan skema yang telah dibuat
      await userSchema.parseAsync(req.body );
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({message:"validation error occurred. please check indicated fields and subtmit again",errorList :e.issues});
      } else {
        return res.status(500).json({ message: "Internal server error" });
      }
    }
};
