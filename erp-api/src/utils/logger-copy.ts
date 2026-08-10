import pino, { Logger, LogDescriptor, StreamEntry } from "pino";
import fs from "fs";
import { Writable } from "stream";
import path from "path";

// Pastikan folder logs ada
const logDir = path.resolve("logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom formatter (msg duluan)
const customFormat = (log: Record<string, any>): string => {
  const { msg, level, time, ...rest } = log;
  return (
    JSON.stringify({
      msg,
      level,
      time,
      ...rest,
    }) + "\n"
  );
};

// Destinasi file log
const destination = fs.createWriteStream(path.join(logDir, "access.log"), {
  flags: "a",
});
const errorDestination = fs.createWriteStream(path.join(logDir, "error.log"), {
  flags: "a",
});

// Stream untuk multistream
const streams: StreamEntry[] = [
  { stream: process.stdout },
  {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        try {
          const parsed = JSON.parse(chunk.toString());
          destination.write(customFormat(parsed));
        } catch (e) {
          // Jika parsing gagal, tetap tulis log mentah
          destination.write(chunk);
        }
        callback();
      },
    }),
  },
  {
    level: "error",
    stream: new Writable({
      write(chunk, _encoding, callback) {
        try {
          const parsed = JSON.parse(chunk.toString());
          errorDestination.write(customFormat(parsed));
        } catch (e) {
          errorDestination.write(chunk);
        }
        callback();
      },
    }),
  },
];

// Inisialisasi logger
const logger: Logger = pino({ formatters: {} }, pino.multistream(streams));

export default logger;
