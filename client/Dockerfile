# ── Stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Pass VITE_API_URL only when explicitly provided (avoids overriding .env.production with empty string)
ARG VITE_API_URL
RUN if [ -n "$VITE_API_URL" ]; then VITE_API_URL=$VITE_API_URL npm run build; else npm run build; fi

# ── Stage 2: serve with nginx ─────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
