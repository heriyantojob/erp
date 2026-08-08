
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    S3Client,
    ListObjectsCommand,
    PutObjectCommand,
  } from "@aws-sdk/client-s3";
import s3ClientConfig from "./s3ClientConfig";
// Bucket and s3: same as above
const Bucket = process.env.AWS_BUCKET_NAME;
const s3 = s3ClientConfig
  // endpoint to get the list of files in the bucket
export async function s3GetFile(key:string) {

    const src =   process.env.NEXT_PUBLIC_AWS_URL_FILE+"/"+key    
    return src

}

  export async function s3GetFilePrivate(key:string) {
    const command = new GetObjectCommand({ Bucket, Key: key });
    const src = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return src

  }