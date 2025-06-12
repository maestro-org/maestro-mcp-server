FROM node:22 AS maestro-mcp-server

LABEL org.opencontainers.image.source=https://github.com/maestro-org/maestro-mcp-server

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
