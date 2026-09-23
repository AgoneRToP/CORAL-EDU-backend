FROM node:22-alpine

WORKDIR /app 

COPY package*.json ./

RUN pnpm install

COPY . . 

RUN npx prisma generate

RUN npm run build

EXPOSE 4000

CMD ["pnpm","run","start:prod"]