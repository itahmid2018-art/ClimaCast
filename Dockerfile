# Production Dockerfile for ClimaCast
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifest
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled full-stack server and static web assets
COPY dist ./dist
COPY public ./public
COPY db.json ./
COPY capacitor.config.json ./

# Expose standard port
EXPOSE 3000

# Run the compiled CommonJS server bundle
CMD ["node", "dist/server.cjs"]
