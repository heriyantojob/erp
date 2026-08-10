import { S3Client } from "@aws-sdk/client-s3";

const s3ClientConfig = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS as string,
    secretAccessKey: process.env.AWS_SECRET as string,
  },
});

export default s3ClientConfig;
