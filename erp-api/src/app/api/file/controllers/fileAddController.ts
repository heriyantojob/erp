import { and, eq, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db/setup.js";

import { Response, Request, NextFunction } from "express";
import slug from "slug";
import multer from "multer";
import s3UploadFile from "@/lib/storage/s3UploadFile";
import { v7 as uuid } from "uuid";
import path from "path";
import sharp from "sharp";
import mime from "mime";
import fs from "fs/promises";
import { tmpdir } from "os";
import { execa } from "execa";
import { dbTableFiles, dbTableFileAttachments } from "@/db/schema"; // Changed from dbTableTemplates and dbTableTemplateAttachments
import s3HeadObjectCommand from "@/lib/storage/s3HeadObjectCommand";
import { fileRepository } from "../repositories/file.repository";
const storagePath = "files";
const parseBooleanField = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
  }
  return false;
};

export async function addFile(req: Request, res: Response, next: NextFunction) {
  // Changed from addFileTemplate
  let idFile = uuid(); // Renamed from idTemplate
  let userAuth = res.locals;
  let slugLink = req?.body?.link ? slug(req?.body?.link) : null;
  let moduleType = req?.body?.moduleType ?? "stock";
  const isAiFlag = parseBooleanField(req?.body?.isAi);
  const imageMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
    "image/jpg",
  ]);
  const audioMimeTypes = new Set([
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
  ]);
  const videoMimeTypes = new Set([
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
  ]);

  if (!req?.file) {
    return res.status(400).json({
      message: "No file uploaded.",
    });
  }
  const file = req?.file;
  let fileType;
  if (
    file?.mimetype === "image/jpeg" ||
    file?.mimetype === "image/png" ||
    file?.mimetype === "image/webp" ||
    file?.mimetype === "image/jpg"
  ) {
    fileType = "photo";
  }
  if (file?.mimetype === "image/gif") fileType = "gif";
  if (file?.mimetype === "image/svg+xml") fileType = "vector";
  if (imageMimeTypes.has(file?.mimetype)) {
    //=== check file name and file path
    let fileExtension = path.extname(file.originalname).toLowerCase();

    const fileNameWithoutExt = slug(
      path.basename(file?.originalname, path.extname(file.originalname)),
    );

    //===preview file upload (webp)
    const previewSizes = [420, 1280]; // width target untuk resize
    const previewFileQuality = ["SD", "HD"]; // kategori output
    const previewFiles = [];
    for (let i = 0; i < previewSizes.length; i++) {
      const size = previewSizes[i];
      const qualityLabel = previewFileQuality[i];
      const previewExtension = ".webp";
      const previewMime = "image/webp";
      const idPreview = uuid();
      const filePreviewName = `${fileNameWithoutExt}-${idPreview}${previewExtension}`;
      const filePreviewPath = `${storagePath}/${filePreviewName}`;

      const previewBuffer = await sharp(file.buffer)
        .resize({ width: size })
        .webp()
        .toBuffer();

      const previewMetadata = await sharp(previewBuffer).metadata();
      const filePreviewWidth = previewMetadata.width;
      const filePreviewHeight = previewMetadata.height;
      const filePreviewSize = Buffer.byteLength(previewBuffer);

      await s3UploadFile({
        fileBuffer: previewBuffer,
        contentType: previewMime,
        fileName: filePreviewPath,
      });

      previewFiles.push({
        id: idPreview,
        idFile: idFile,
        fileName: filePreviewName,
        filePath: filePreviewPath,
        fileExt: previewExtension,
        fileSize: filePreviewSize,
        fileMime: previewMime,
        fileHeight: filePreviewHeight,
        fileWidth: filePreviewWidth,
        inPreview: qualityLabel == "SD" ? 1 : 0,
        inPreviewHd: qualityLabel == "HD" ? 1 : 0,
        fileQuality: qualityLabel, // sd | hd | fhd
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    //=== file file upload
    let idFileProject = uuid();
    let fileName = fileNameWithoutExt + "-" + idFileProject + fileExtension;
    let filePath = `${storagePath}/${fileName}`;
    let fileMime = mime.getType(fileExtension);
    let checkSizeFile = await s3HeadObjectCommand({ objectKey: filePath });
    let fileSizeFile = checkSizeFile?.ContentLength
      ? checkSizeFile.ContentLength
      : 0;
    const fileMetaData = await sharp(file.buffer).metadata();
    let fileWidth = fileMetaData.width;
    let fileHeight = fileMetaData.height;

    await s3UploadFile({
      fileBuffer: file.buffer,
      contentType: fileMime as string,
      fileName: filePath,
    });

    //=== Generate additional sizes
    const sizes = [640, 1280, 1920]; // width target untuk resize
    const fileQuality = ["SD", "HD", "FHD"]; // kategori output
    const additionalFiles = [];
    if (moduleType === "stock") {
      for (let i = 0; i < sizes.length; i++) {
        const size = sizes[i];
        const qualityLabel = fileQuality[i]; // <-- mapping index kualitas

        const fileExtensionAdditional = fileExtension;
        const fileMimeAdditional = mime.getType(
          fileExtensionAdditional,
        ) as string;

        const idAdditional = uuid();
        const additionalName = `${fileNameWithoutExt}-${idAdditional}${fileExtensionAdditional}`;
        const additionalPath = `${storagePath}/${additionalName}`;

        let resizedBuffer;

        if (fileExtension === ".svg") {
          resizedBuffer = await sharp(file.buffer)
            .png()
            .resize({ width: size })
            .toBuffer();
        } else {
          resizedBuffer = await sharp(file.buffer)
            .resize({ width: size })
            .toBuffer();
        }

        const resizedMetadata = await sharp(resizedBuffer).metadata();
        const additionalWidth = resizedMetadata.width;
        const additionalHeight = resizedMetadata.height;
        const additionalSize = Buffer.byteLength(resizedBuffer);

        await s3UploadFile({
          fileBuffer: resizedBuffer,
          contentType: fileMimeAdditional,
          fileName: additionalPath,
        });

        additionalFiles.push({
          id: idAdditional,
          idFile,
          fileName: additionalName,
          filePath: additionalPath,
          fileExt: fileExtensionAdditional,
          fileSize: additionalSize,
          fileMime: fileMimeAdditional,
          fileWidth: additionalWidth,
          fileHeight: additionalHeight,
          inDownload: 1,
          isAdditionalFile: 1,
          //inPreviewHd:(qualityLabel=="HD")?1:0,
          inPreviewHd: 0,

          // ⬇️ Tambahan penting sesuai permintaan
          fileQuality: qualityLabel, // sd | hd | fhd
        });
      }
    }

    //==insert file entry
    //let tags
    const tags = Array.isArray(req?.body?.tags)
      ? req?.body?.tags
      : typeof req?.body?.tags === "string" && req?.body?.tags != null
        ? req?.body?.tags?.split(",")
        : null;

    try {
      await fileRepository.insertFile({
        id: idFile,
        owner: userAuth?.user?.id as string,
        fileType: fileType as string,
        // moduleType: req?.body?.moduleType ?? 'stock',
        moduleType: moduleType,
        //  moduleType:  'stock',
        title: req?.body?.title ?? "",
        description: req?.body?.description ?? "",
        status: req?.body?.status ?? 0,
        // slug:req?.body?.link?? null,
        slug: slugLink ?? null,
        isAi: isAiFlag ? 1 : 0,
        tags: tags,
        //tags:"a",
      });

      await fileRepository.insertAttachment({
        id: idFileProject,
        idFile: idFile,
        fileName: fileName,
        filePath: filePath,
        fileExt: fileExtension,
        fileSize: fileSizeFile,
        fileMime: fileMime,
        fileWidth: fileWidth,
        fileHeight: fileHeight,
        inDownload: 1,
        fileQuality: "Original", // sd | hd | fhd
      });

      //===insert file file preview(s)
      if (previewFiles.length > 0) {
        await fileRepository.insertAttachments(previewFiles);
      }
      await fileRepository.insertAttachments(additionalFiles);

      return res.status(200).json({ message: "add file", fileExtension });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to save in database",
        // error: error.message
      });
    }
    //===insert file file project
  } else if (
    audioMimeTypes.has(file?.mimetype) ||
    videoMimeTypes.has(file?.mimetype)
  ) {
    const isVideo = videoMimeTypes.has(file?.mimetype);
    fileType = isVideo ? "video" : "audio";
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const mimeExtension = mime.getExtension(file?.mimetype || "") || "";
    const safeExtension =
      fileExtension || (mimeExtension ? `.${mimeExtension}` : "");
    const fileNameWithoutExt = slug(
      path.basename(file?.originalname, path.extname(file.originalname)),
    );
    const idFileProject = uuid();
    const fileName = `${fileNameWithoutExt}-${idFileProject}${safeExtension}`;
    const filePath = `${storagePath}/${fileName}`;
    const fileMime =
      file?.mimetype ||
      mime.getType(safeExtension) ||
      "application/octet-stream";
    const fileSizeFile =
      typeof file?.size === "number"
        ? file.size
        : Buffer.byteLength(file.buffer);

    await s3UploadFile({
      fileBuffer: file.buffer,
      contentType: fileMime as string,
      fileName: filePath,
    });

    const tags = Array.isArray(req?.body?.tags)
      ? req?.body?.tags
      : typeof req?.body?.tags === "string" && req?.body?.tags != null
        ? req?.body?.tags?.split(",")
        : null;

    try {
      await fileRepository.insertFile({
        id: idFile,
        owner: userAuth?.user?.id as string,
        fileType: fileType as string,
        moduleType: "stock",
        title: req?.body?.title ?? "",
        description: req?.body?.description ?? "",
        status: req?.body?.status ?? 0,
        slug: slugLink ?? null,
        isAi: isAiFlag ? 1 : 0,
        tags: tags,
      });

      const previewId = uuid();
      const previewHdId = uuid();
      const downloadId = uuid();

      let videoWidth: number | null = null;
      let videoHeight: number | null = null;

      if (isVideo) {
        const tempDir = await fs.mkdtemp(
          path.join(tmpdir(), "file-video-preview-"),
        );
        const tempVideoPath = path.join(
          tempDir,
          `video${safeExtension || ".mp4"}`,
        );
        const tempFramePath = path.join(tempDir, "frame.png");

        try {
          await fs.writeFile(tempVideoPath, file.buffer);
          try {
            const probeResult = await execa("ffprobe", [
              "-v",
              "error",
              "-select_streams",
              "v:0",
              "-show_entries",
              "stream=width,height",
              "-of",
              "json",
              tempVideoPath,
            ]);
            const probeJson = JSON.parse(probeResult.stdout || "{}");
            const stream = Array.isArray(probeJson?.streams)
              ? probeJson.streams[0]
              : null;
            if (
              stream &&
              typeof stream.width === "number" &&
              typeof stream.height === "number"
            ) {
              videoWidth = stream.width;
              videoHeight = stream.height;
            }
          } catch {}
          await execa("ffmpeg", [
            "-y",
            "-i",
            tempVideoPath,
            "-vframes",
            "1",
            "-vf",
            "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            tempFramePath,
          ]);

          const frameBuffer = await fs.readFile(tempFramePath);
          const previewSizes = [420, 1280];
          const previewFileQuality = ["SD", "HD"];
          const previewExtension = ".webp";
          const previewMime = "image/webp";

          for (let i = 0; i < previewSizes.length; i++) {
            const size = previewSizes[i];
            const qualityLabel = previewFileQuality[i];
            const idPreview = qualityLabel === "SD" ? previewId : previewHdId;
            const filePreviewName = `${fileNameWithoutExt}-${idPreview}${previewExtension}`;
            const filePreviewPath = `${storagePath}/${filePreviewName}`;

            const previewBuffer = await sharp(frameBuffer)
              .resize({ width: size })
              .webp()
              .toBuffer();

            const previewMetadata = await sharp(previewBuffer).metadata();
            const filePreviewWidth = previewMetadata.width;
            const filePreviewHeight = previewMetadata.height;
            const filePreviewSize = Buffer.byteLength(previewBuffer);

            await s3UploadFile({
              fileBuffer: previewBuffer,
              contentType: previewMime,
              fileName: filePreviewPath,
            });

            await fileRepository.insertAttachment({
              id: idPreview,
              idFile: idFile,
              fileName: filePreviewName,
              filePath: filePreviewPath,
              fileExt: previewExtension,
              fileSize: filePreviewSize,
              fileMime: previewMime,
              fileHeight: filePreviewHeight,
              fileWidth: filePreviewWidth,
              inPreview: qualityLabel === "SD" ? 1 : 0,
              inPreviewHd: qualityLabel === "HD" ? 1 : 0,
              inDownload: 0,
              fileQuality: qualityLabel,
            });
          }
        } finally {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch {}
        }
      } else {
        await fileRepository.insertAttachment({
          id: previewId,
          idFile: idFile,
          fileName: fileName,
          filePath: filePath,
          fileExt: safeExtension,
          fileSize: fileSizeFile,
          fileMime: fileMime,
          inPreview: 1,
          inDownload: 0,
          fileQuality: "Preview",
        });
      }

      await fileRepository.insertAttachment({
        id: downloadId,
        idFile: idFile,
        fileName: fileName,
        filePath: filePath,
        fileExt: safeExtension,
        fileSize: fileSizeFile,
        fileMime: fileMime,
        fileWidth: isVideo ? (videoWidth ?? undefined) : undefined,
        fileHeight: isVideo ? (videoHeight ?? undefined) : undefined,
        inPreview: 0,
        inDownload: 1,
        fileQuality: "Original",
      });

      return res
        .status(200)
        .json({ message: "add file", fileExtension: safeExtension });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to save in database",
      });
    }
  } else {
    return res
      .status(400)
      .send({ message: "File upload must be image, audio, or video" });
  }
}

export async function addProjectFile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  return res.status(200).json({ message: "add file project" });
}
