import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const bucketName = process.env.AWS_BUCKET_NAME || "pictheme";
const endpoint = process.env.AWS_ENDPOINT?.replace(/\/$/, "");
const publicBaseUrl =
  process.env.NEXT_PUBLIC_AWS_URL_FILE ||
  (endpoint ? `${endpoint}/${bucketName}` : undefined);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS || "",
    secretAccessKey: process.env.AWS_SECRET || "",
  },
  forcePathStyle: true,
});

type UploadResult = {
  key: string;
  url?: string;
  contentType?: string;
};

export async function uploadToS3(
  filePath: string,
  key: string,
  contentType = "application/octet-stream",
): Promise<UploadResult> {
  const cleanKey = key.replace(/^\/+/, "");
  const fileStream = fs.createReadStream(filePath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: fileStream,
      ContentType: contentType,
    }),
  );

  const url = publicBaseUrl ? `${publicBaseUrl}/${cleanKey}` : undefined;

  return {
    key: cleanKey,
    url,
    contentType,
  };
}
