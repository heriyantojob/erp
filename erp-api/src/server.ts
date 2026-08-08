import express, { urlencoded, json } from "express";
import { notFound } from "./middleware/not-found";
import { error } from "./middleware/error";
import cors from 'cors';
// import corsOptions from "./config/corsOptions";
import routes from "./routes";
import pinoHttp from "pino-http";
import logger from "./utils/logger";
import { auth } from "./lib/better-auth/auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";

const app = express();
 //app.use(cors({ origin: '*',credentials: true })); // Adjust the origin as per your requirement
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Requests proxied by Next.js may not include an Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
}));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
  
    app.all(["/api/auth", "/api/auth/*splat"], (req, res, next) => {
      next();
    }, toNodeHandler(auth)); // middleware auth tetap dijalankan
    

  
  // Use the cors middleware with options

app.get("/me", async (req, res) => {
  const session = await auth.api.getSession({
     headers: fromNodeHeaders(req.headers),
   });
 return res.json(session);
});
app.use(pinoHttp({ logger }));
  
app.use(express.json({ limit: "200mb" }));  // Adjust as needed
app.use(express.urlencoded({ limit: "200mb", extended: true }));
// app.use(urlencoded({ extended: true }));
app.use(json());
app.get('/', (req, res) => {
  res.send('Masuk dari /');
});

app.use('/', routes);

// app.use("/api", notesRouter);

app.use(notFound);
app.use(error);

export default app;
