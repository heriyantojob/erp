
import s3ClientConfig from "./s3ClientConfig";
import { S3Client, PutObjectCommand ,HeadObjectCommand } from "@aws-sdk/client-s3";
export default async function s3HeadObjectCommand({
     objectKey
}: {
	objectKey: string;
  }) {
	try{
		const command = new HeadObjectCommand({
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: objectKey,
		  });
		  
		  const response = await s3ClientConfig.send(command);

		  return response
	}catch(e){
			return null
	}
	
	  
}