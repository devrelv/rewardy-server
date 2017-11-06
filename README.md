Auxiliar
==================================

Getting Started
---------------

Based on https://github.com/developit/express-es6-rest-api

```sh
# clone it
git clone auxiliar.git
cd auxiliar

# Make it your own
rm -rf .git && git init && npm init

# Install dependencies
npm install

# Start development live-reload server
PORT=8080 npm run dev

# Start production server:
PORT=8080 npm start
```

Docker Support
------

```sh
cd auxiliar

# Build your docker
docker build -t es6/api-service .
#            ^      ^           ^
#          tag  tag name      Dockerfile location

# run your docker
docker run -p 8080:8080 es6/api-service
#                 ^            ^
#          bind the port    container tag
#          to your host
#          machine port   

```

Heroku Support
------

Setup [Heroku CLI](https://toolbelt.heroku.com) as instructed. After that is set up, navigate on the command line to the repository and:

* `heroku login`
* `heroku create auxiliar` - Create a Heroku app. You can replace `auxiliar` with anything. 
* `heroku config:set HEROKU_URL=$(heroku apps:info -s  | grep web_url | cut -d= -f2)` - Exposes the Heroku app URL from inside the app (so the bot will be able to set the webhook)
* `heroku config:set NPM_CONFIG_PRODUCTION=false` -  to install `devDependencies`
* `git push heroku master` - Deploys your bot
* `heroku logs --tail` - Logs