import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { execa } from "execa";
import { createCanvas } from "canvas";
import type { Express } from "express";
import { uploadToS3 } from "@/utils/s3";

export type GeneratedTwibbonVideo = {
  s3Key: string;
  downloadUrl?: string;
  contentType: string;
  filename: string;
};

function buildBaseFrame(width: number, height: number) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
}

export async function generateTwibbonVideo(file?: Express.Multer.File | Express.Multer.File[]): Promise<GeneratedTwibbonVideo> {
  const width = 1080;
  const height = 1080;

  const twibbonPath = path.resolve(process.cwd(), "assets/images/demo/twibbon.png");

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "demo-twibbon-"));
  const primaryFile = Array.isArray(file) ? file[0] : file;
  const uploadPath = primaryFile ? path.join(tempDir, primaryFile.originalname || "upload.bin") : null;
  const framePath = path.join(tempDir, "frame.png");
  const outVideo = path.join(tempDir, "output.mp4");

  // Persist uploaded file or fallback frame
  if (primaryFile && uploadPath) {
    await fs.writeFile(uploadPath, primaryFile.buffer);
  } else {
    const baseFrame = buildBaseFrame(width, height);
    await fs.writeFile(framePath, baseFrame);
  }

  const isImage = primaryFile?.mimetype?.startsWith("image/");
  const hasUpload = Boolean(primaryFile);
  const inputPath = hasUpload && uploadPath ? uploadPath : framePath;

  const ffmpegArgs = [
    "-y",
    ...((!hasUpload || isImage) ? ["-loop", "1"] : []),
    "-i",
    inputPath,
    "-i",
    twibbonPath,
    "-filter_complex",
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black[v0];[v0][1:v]overlay=0:0`,
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-c:v",
    "libx264",
    ...((!hasUpload || isImage) ? ["-t", "5", "-an"] : ["-shortest", "-c:a", "aac"]),
    outVideo,
  ];

  await execa("ffmpeg", ffmpegArgs);

  const s3Key = `temp/demo-twibbon/output-${Date.now()}.mp4`;
  const contentType = "video/mp4";

  try {
    const uploadResult = await uploadToS3(outVideo, s3Key, contentType);
    return {
      s3Key: uploadResult.key,
      downloadUrl: uploadResult.url,
      contentType,
      filename: path.basename(uploadResult.key),
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
