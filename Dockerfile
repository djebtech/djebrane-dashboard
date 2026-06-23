# syntax=docker/dockerfile:1

# ---- Builder: install all deps (incl. dev) and build Next ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runner: production image ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# The custom server runs via `tsx server.ts`, so the runtime image needs the
# TS source (server.ts + lib/**), the .next build, and node_modules (tsx is a
# production dependency). Copying the built /app gives us all of it.
COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "run", "start"]
