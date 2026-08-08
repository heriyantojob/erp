import tokenInsert from "./tokenInsert"
import { v4 as uuidv4 } from 'uuid';
async function tokenInsertOAuth(user){

    const  idSession = uuidv4()
              
    const userWithoutPass={
      name: user?.name,
      email: user?.email,
      id: user?.id,
      image:  user?.image,
      sessionID:idSession,
    }
  
    let resultSession= await tokenInsert(
      {
        user:userWithoutPass,
        idSession:idSession,
        
      }
     )
     return resultSession
     
  }

  export default tokenInsertOAuth