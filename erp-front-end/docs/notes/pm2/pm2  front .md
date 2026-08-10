cd /home/pictheme/htdocs/pictheme.com

git pull https://gitlab.com/heriyantojob/targetviral-design.git production

npm run build:prod

sudo pm2 start npm --name "pictheme" -- run start -- --port=3200

pm2 reload pictheme
pm2 restart pictheme
pm2 delete pictheme
