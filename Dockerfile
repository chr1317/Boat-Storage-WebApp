FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY Backend ./Backend

EXPOSE 3000

CMD ["npm", "run", "start"]
