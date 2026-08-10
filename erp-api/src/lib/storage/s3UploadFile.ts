import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import s3ClientConfig from "./s3ClientConfig";
import { ObjectCannedACL } from "@aws-sdk/client-s3";
interface S3UploadFileParams {
  fileBuffer: Buffer;
  fileName: string;
  contentType?: string;
  ACL?: ObjectCannedACL;
}
export default async function s3UploadFile({
  fileBuffer,
  fileName,
  contentType = "image/jpg",
  ACL = ObjectCannedACL.public_read,
}: S3UploadFileParams) {
  //const fileBuffer = file;

  const params = {
    ACL: ACL,
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${fileName}`,
    Body: fileBuffer,
    ContentType: contentType,
    // ACL: "private" || "public-read" || "public-read-write" || "authenticated-read" || "aws-exec-read" || "bucket-owner-read" || "bucket-owner-full-control",
  };

  const command = new PutObjectCommand(params);
  let upload = await s3ClientConfig.send(command);
  return upload;
}
