D:\project\code\project real\pictheme\pictheme-curent-version\pictheme-api-pg\src\routes\cronRoutes.ts

Write a standalone Node.js script to purge old folders in S3 compatible storage. Path structure is 'temp/campaign-video/{date}/{hour}/'. Instead of checking folder names, list all objects under 'temp/campaign-video/' and delete those with a LastModified timestamp older than 60 minutes. Use AWS SDK v3 and include a simple console.log for successful deletions. Ensure it uses environment variables for credentials.
woth env
AWS_ENDPOINT="http://192.168.18.12:9000"
AWS_REGION="us-east-1"
AWS_ACCESS=C74PLlNtxAXVWfZM0Zkq
AWS_SECRET="yKVOKIF7IR97WnCOxUlJdKU0lSp4xEmHh39WfOyl"
AWS_BUCKET_NAME="pictheme"
AWS_ENDPOINT_HOST="192.168.18.12:9000"
NEXT_PUBLIC_AWS_URL_FILE="http://192.168.18.12:9000/pictheme"
