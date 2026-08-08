import {  signJwtAccessToken, signJwtRefreshToken } from "@/lib/security/jwt";
import * as bcrypt from "bcrypt";
import { users,sessions } from "@/db/schema";
import { db } from "@/db/setup";
async function tokenInsert({
    user,
    idSession,
    ip="",
    userAgent=""
}){
    

    const accessTokenResult = await signJwtAccessToken(user);
    const refreshTokenResult = await signJwtRefreshToken(user);
    
    const refreshTokenHash = await bcrypt.hash(refreshTokenResult.token, 10);
 
    // await db.insert(sessions).values({ 
    //   id:idSession,
    //   userId:user.id,
    //   sessionToken:refreshTokenHash,

    //   ip:ip,
    //   userAgent:userAgent,

    // });

    return {
        accessTokenResult,
        refreshTokenResult,
        
    }
    // return {
    //     accessTokenResult,
    //     refreshTokenResult,
        
    // }
 

}
export default tokenInsert