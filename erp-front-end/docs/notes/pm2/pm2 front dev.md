cd /home/pictheme-dev-front/htdocs/dev-front.pictheme.com
git pull https://gitlab.com/heriyantojob/targetviral-design.git dev

npm run build:dev

sudo pm2 start npm --name "dev-pictheme" -- run start -- --port=3300
pm2 reload dev-pictheme
pm2 restart dev-pictheme
pm2 delete dev-pictheme
