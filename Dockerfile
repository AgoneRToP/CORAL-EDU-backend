FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package*.json ./

RUN pnpm install

COPY . .

RUN npx prisma generate

RUN pnpm run build

EXPOSE 4000

CMD ["pnpm", "run", "start:prod"]