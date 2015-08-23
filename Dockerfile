FROM node:0.12

EXPOSE 3000

RUN mkdir /app

WORKDIR /app

ADD . /app

RUN npm install

CMD node js/storyGenerator.js
