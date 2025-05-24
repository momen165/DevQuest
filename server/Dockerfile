# Dockerfile (inside DevQuest/server)
FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
