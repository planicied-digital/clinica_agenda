FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl tzdata
ENV TZ=America/Manaus

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx prisma generate && npm run build


FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl tzdata
ENV NODE_ENV=production
ENV TZ=America/Manaus

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
