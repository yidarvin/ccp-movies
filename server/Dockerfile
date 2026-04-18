FROM node:20-alpine
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Generate Prisma client against the local schema
RUN npx prisma generate

# Copy application source
COPY src ./src/
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
