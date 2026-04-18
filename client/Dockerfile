# ── Stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# VITE_API_URL=/api → nginx proxies /api to the server container
RUN VITE_API_URL=/api npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
