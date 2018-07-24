# select version on node js
FROM node:8
# app dir (in doc container)
WORKDIR /usr/src/ask-apiko-api

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
# copy only images
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# copy all files to docker imaged
COPY . .

# Define environment variable
ENV TEST 'hello word'

# use it port to listen
EXPOSE 3001

# run cmd comand
CMD [ "npm", "start" ]