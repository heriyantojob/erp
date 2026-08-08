cd /home/pictheme-dev-api/htdocs/dev-api.pictheme.com
git init
dev
  git pull https://gitlab.com/heriyantojob/targetviral-api.git dev
 
 npm run build


 pm2 start npm --name "dev-pictheme-api" -- run start
 pm2 reload dev-pictheme-api
  pm2 restart dev-pictheme-api
pm2 delete dev-pictheme-api