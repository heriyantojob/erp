import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import s3ClientConfig from "./s3ClientConfig";

const s3DeleteMultiple = async ({
  filesDelete = [],
}: {
  filesDelete: string[];
}) => {
  // const filesPathInS3 = ['user-file/08e9c63d-571d-4f0d-881d-fe04576dc5a6.jpeg', 'user-file/0a575ed6-1acd-42d7-ae7a-f005dac546c5.json']

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Delete: {
      Objects: filesDelete.map((key) => ({ Key: key })),
    },
  };

  await s3ClientConfig.send(new DeleteObjectsCommand(params));
};

export default s3DeleteMultiple;
