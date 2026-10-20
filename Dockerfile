FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
WORKDIR /app
ARG PRISMA_SCHEMA=prisma/schema.postgres.prisma
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=${PRISMA_SCHEMA} && npx next build --webpack

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
EXPOSE 3456
CMD ["npm", "run", "start"]
