import { and, eq, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db/setup.js";
import { user } from "@/db/schema";
import { Response, Request, NextFunction } from "express";
import { CustomError } from "@/lib/custom-error";
import { validationResult } from "express-validator";
import {selectField, updateUserField,insertUserField} from "./userAdminModel"
import multer from 'multer';
import s3UploadFile from "@/lib/storage/s3UploadFile";
import { v7 as uuid } from 'uuid';
import path from "path";
import sharp from "sharp";
export async function listUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
 //return res.status(200).json({ data:"GEt all user" });
  //pagination
  let userAuth=res.locals
  const pageQuery = parseInt(req.query.page as string) || 0;
  const perPage = parseInt(req.query.per_page as string) || 5;

  const page = ( pageQuery>0)?pageQuery-1 : 0

  let total:number = 0;
  let totalPages = 0;
 
  const whereSQL = [
    isNull(user.deletedAt)
  ]
  // if (qParams ) {
  
   
  // }
  if(req?.query?.email){

    whereSQL.push(like(user.email,"%"+req?.query?.email+"%"))
  }

  //pagination  user pagination count

  try {
    const resultTotal = await db.select({ total: sql`COUNT(*)` }).from(user)
    .where(
      and(
       ...whereSQL
        
      )
    
    )

    total =resultTotal[0]?.total as number
    totalPages = Math.ceil(total / perPage);

//const totalPages = Math.ceil(total / pageSize);
  } catch (error) {
    // total = error
    // logDebug("gagal page")
    
  }
  //select response user
  try {
    const usersList = await db.select(selectField).from(user).
    where( and(
      ...whereSQL
     ))    
      .limit(perPage)
      .offset(page * perPage)
 

  
    return res.status(200).json({ 
      items:usersList,total,totalPages,
      page:page+1,perPage 
    });

    
   //return res.status(400).send("Tesssss")
  } catch (error) {
    return res.status(500).json({ 
      error:error,message:"An error occurred on the server. Please try again later" 
    });
    
   // next(new CustomError("Failed to fetch notes", 500));
  }
}

export async function addUser(req: Request, res: Response, next: NextFunction) {
  //   const result = validationResult(req);
  // return res.status(200).json({ message:"berhasil" });

  const result = validationResult(req);
   let userAuth= res.locals;

    if (!result.isEmpty()) {
    //  return next(new CustomError(JSON.stringify(result.array()), 400));
      return res.status(400).json({ errorList:result.array(),message:"" });
    }
    try {
     
      let body = req.body
      let insertUserData =await insertUserField(
        body,userAuth?.user.accessLevel
      )
      // return res.status(200).json({ 
      //   insertUserData:insertUserData ,

      
      // });
     
      const note = await db.insert(user).values(insertUserData)
      return res.status(200).json({ 
       // body:req.body ,
        // userAuth
        message:"Success Update"
      
      });
    } catch (error) {
      next(new CustomError(error as string, 500));
      return res.status(500).json({ message:error });

    }
  
  }

export async function viewUser(req: Request, res: Response, next: NextFunction) {

  let userAuth=res.locals
  const result = validationResult(req);
  if (!result.isEmpty()) {
   return next(new CustomError(JSON.stringify(result.array()), 400));
  }
  //where sql
  const whereSQL = [
    eq(user.id, req.params.id as string)
  
    // like(userFiles.title,"%"+qParams+"%"),
  ]

  //whereSQL.push(like(userFiles.title,"%"+qParams+"%"))

  
  try {
    const usersData = await db
      .select(selectField)
      .from(user)
      .where( and(
        ...whereSQL
         
       ));
    res.status(200).json({ items:usersData[0] });
  } catch (error) {
    next(new CustomError("Failed to fetch note", 500));
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(200).json({ message:"delete User" });
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let userAuth= res.locals;
  try {
    let body = req.body
    let updateUserData =  await updateUserField(body,userAuth?.user.accessLevel)
    const note = await db
      .update(user)
      .set(updateUserData)
      .where(eq(user.id, req.params.id as string))
      // .returning();

    res.status(200).json({ message:"success update user" });
  } catch (error) {
    next(new CustomError("Failed to update note", 500));
  }
}
// const upload = multer({ dest: 'uploads/' });
// export const uploadMiddleware = upload.single('file');
export async function uploadUser(  
  req: Request,
  res: Response){
    let userAuth =res.locals
    const file = req?.file;
 
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }
  
    if (file?.mimetype === 'image/jpeg' || file?.mimetype === 'image/png') {
      try {

        const userData = await db.query.user.findFirst({
          columns: {
            uid: true
          },
          where: eq(user.id, req.params.id as string)
        });
        if(!userData){
          return res.status(400).send('User not found');
        }

        let pathName = path.extname(file.originalname).toLowerCase()
        let fileName = "avatar/"+userData.uid+pathName
        const processedImageBuffer = await sharp(file.buffer)
        .resize({ width: 300 })  // Example resize operation
        .toBuffer();

        await s3UploadFile({
          fileBuffer:processedImageBuffer,
         // fileName:"avatar/"+file?.originalname
          fileName:fileName
        })
     
        const timestamp = new Date().getTime();
        const updateImages = await db
        .update(user)
        .set({image:fileName+"?v="+timestamp})
        .where(eq(user.id, req.params.id as string))
        return res.status(200).send({ 
          message: 'File uploaded successfully', 
          file: file?.originalname,
          endpoint :process.env.AWS_ENDPOINT,
          uid :userAuth?.user?.uid,
          path :pathName,
          fileName:fileName,
          fileNameUpload:fileName+"?v="+timestamp
         // buffer :file.buffer,
        });
      } catch (error) {
        return res.status(400).send('User not found');
      }
    } else {
      return res.status(400).send('File must Jpeg or png');  
    }
    

}

