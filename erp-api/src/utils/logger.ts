import pino, { LoggerOptions } from "pino";
import fs from "fs";
import path from "path";

/* ================================
   Setup folder logs
================================ */
const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/* ================================
   Pino level map (official)
================================ */
const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/* ================================
   Formatter
================================ */
const formatLog = (log: any): string => {
  const date = new Date(log.time)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  const level =
    Object.keys(LEVELS)
      .find((k) => LEVELS[k as keyof typeof LEVELS] === log.level)
      ?.toUpperCase() ?? "UNKNOWN";

  const reqInfo = log.req ? ` (${log.req.method} ${log.req.url})` : "";

  const stack = log.err?.stack ? `\n${log.err.stack}` : "";

  return `[${date}] ${level}: ${log.msg}${reqInfo}${stack}\n`;
};

/* ================================
   Exact-level stream
================================ */
const exactLevelStream = (level: number, filename: string) => {
  const file = fs.createWriteStream(path.join(logDir, filename), {
    flags: "a",
  });

  return {
    write: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.level !== level) return; // ⛔ FILTER EKSAK
        file.write(formatLog(parsed));
      } catch {
        /* ignore invalid log */
      }
    },
  };
};

/* ================================
   All streams (1 level = 1 file)
================================ */
const streams = [
  exactLevelStream(LEVELS.trace, "trace.log"),
  exactLevelStream(LEVELS.debug, "debug.log"),
  exactLevelStream(LEVELS.info, "info.log"),
  exactLevelStream(LEVELS.warn, "warn.log"),
  exactLevelStream(LEVELS.error, "error.log"),
  exactLevelStream(LEVELS.fatal, "fatal.log"),
];

/* ================================
   Logger instance
================================ */
const logger = pino(
  {
    level: process.env.NODE_ENV === "production" ? "info" : "trace",
    base: null,
    timestamp: pino.stdTimeFunctions.epochTime,
  } as LoggerOptions,
  {
    write: (data: string) => {
      // broadcast ke semua stream, tapi difilter
      streams.forEach((s) => s.write(data));
      process.stdout.write(formatLog(JSON.parse(data))); // optional console
    },
  },
);

export default logger;
