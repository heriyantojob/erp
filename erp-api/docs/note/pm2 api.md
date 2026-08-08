

cd /home/pictheme-api/htdocs/api.pictheme.com
production
  git pull https://gitlab.com/heriyantojob/targetviral-api.git production
 
 npm run build




 pm2 start npm --name "pictheme-api" -- run start
 pm2 reload pictheme-api
  pm2 restart pictheme-api
pm2 delete pictheme-api