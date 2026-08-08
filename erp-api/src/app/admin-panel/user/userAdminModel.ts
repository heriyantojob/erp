import { user } from "@/db/schema";
import { UserType,UserTypeWithId } from "./userAdminType";
import { v7 as uuid } from 'uuid';
import argon2 from 'argon2';
 export const selectField = {
    "id": user.id,
    "uid": user.uid,
    "name": user.name,
    "email": user.email,
    "emailVerified": user.emailVerified,
    "image": user.image,
    "username": user.username,
    // "password": users.password,
    "about": user.about,
    "phone": user.phone,
    "user_verified": user.user_verified,


    "role": user.role,
    "banned": user.banned,
    "contributor": user.contributor,
    "created_at": user.createdAt,
    "updated_at": user.updatedAt,
    "deleted_at": user.deletedAt
  }

  export async function insertUserField(body:UserType,userAuthAdminType:number){
    let idUser= uuid();
    const data:UserTypeWithId = {
      id:idUser,
      name: body?.name,
      email: body?.email,
      username :  body?.username,
      about: body?.about,
      phone: body?.phone,

      role: body?.role ?? "user",
      contributor: body?.contributor,
      banned: body?.banned ?? false,
      
    
     
    };
    if(body.password){
      const hashedPassword = await argon2.hash(body.password);
      data.password = hashedPassword
    }
   
    return  data
  }

  export async function updateUserField(
    body:UserType,
    userAuthAdminType:number
  ){
      
    const data :UserType= {

      name: body?.name,
      email: body?.email,
      username :  body?.username,
      about: body?.about,
      phone: body?.phone,
      role: body?.role,
      contributor: body?.contributor,
      banned: body?.banned,
    };
    if(body.password){
      const hashedPassword = await argon2.hash(body.password);
      data.password = hashedPassword
    }
    return  data

  
    return  data
  }


