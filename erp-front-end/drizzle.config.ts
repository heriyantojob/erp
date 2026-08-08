import { Config,defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.local" });
// import {configDBPG} from "./configDB"



export default defineConfig({
  schema: "./db/mysql2/schema.ts",
  out: "./drizzle",
  // driver: "d1-http",
  dbCredentials: {
    url: process.env.DB_URL!,

    // host: process.env.DB_HOST!,
    // user: process.env.DB_USER!,
    // password: process.env.DB_PASSWORD!,
    // database: process.env.DB_DATABASE!,
   
  },
  dialect: "mysql",
  verbose: true,
  strict: true,
});

// export default {
//     schema: "./db/pg/schema.ts",
//     out: "./db/pg/migrations",
//     driver:"pg",
//     dbCredentials: {
//       connectionString: process.env.DB_URL!,
      
//     },
  
  
//     verbose: true,
//     strict: true,
//   }  satisfies Config;




// export default configDBPG satisfies Config;


