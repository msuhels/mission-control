# ============================================================
# Stage: base — shared Node + deps
# ============================================================
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage: dev — hot-reload via mounted volumes
# ============================================================
FROM base AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ============================================================
# Stage: build — production build
# ============================================================
FROM base AS build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ============================================================
# Stage: prod — minimal production image
# ============================================================
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "start"]
