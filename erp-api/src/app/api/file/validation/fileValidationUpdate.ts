import { nullable, z, ZodError } from 'zod';
import { user,dbTableFiles } from "@/db/schema";
import { and, eq } from 'drizzle-orm';
import { db } from "@/db/setup";
import { tableFiles } from "@/db/table/tableFiles";
import { title } from 'process';
import slug from 'slug';
import { fileRepository } from '../repositories/file.repository';

// Middleware untuk validasi
export const validateFileUpdate = async (req: any, res: any, next: any) => {
  let userAuth = res.locals;
  if(userAuth?.user?.contributor !==1){
    return res.status(404).json({ message:  "You are not Contributor" });
  }

  // return 
    let resultFileExist 
      try {
        resultFileExist  = await fileRepository.findById(req.params.id);
        if(!resultFileExist){
          return res.status(404).json({ message: "file Not Found" });
        }
      
      } catch (error) {
        return res.status(404).json({ message: "update failed" });
      }

    try {

        const fileSchema = z.object({
          title: z.string(),
          description: z.string().nullable(),
          status:  z.union([z.string(), z.number()]),
          link :z.string()
          .refine(async (value) => {
     
            const slugLink = value.trim()
                ? slug(value).trim() || null
                : null;

              // Jika kosong, tidak perlu cek database
              if (!slugLink) {
                return true;
              }

            if (slugLink) {
              const fileinUse = await fileRepository.findBySlug(slugLink);
              if (!fileinUse) {
                return true;
              } else {
                if (resultFileExist.slug == slugLink) {
                  return true;
                }
              }
            }
           
              
          }, {
            message: "Link already in use" ,
          })
          
        });
        // Lakukan parse dengan skema yang telah dibuat
        await fileSchema.parseAsync(req.body );
        next();
      } catch (e) {
        if (e instanceof ZodError) {
          return res.status(400).json(
            {
              message:"validation error occurred. please check indicated fields and submit again",
              errorList :e.issues
            });
        } else {
          return res.status(500).json({ message: "Internal server error" });
        }
      }
    
    //return res.status(400).json({message:"validation error occurred. please check indicated fields and subtmit again"});
}
