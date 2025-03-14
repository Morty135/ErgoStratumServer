FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3333 3332

# Start the mining pool
CMD ["node", "start.js"]
