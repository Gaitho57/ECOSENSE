# ===========================================
# EcoSense AI — Nginx Production Dockerfile
# Multi-stage: builds React frontend, then serves via Nginx
# ===========================================

# -----------------------------------------
# Stage 1: Build the React frontend
# -----------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# -----------------------------------------
# Stage 2: Nginx with frontend + proxy config
# -----------------------------------------
FROM nginx:1.23-alpine

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx/prod.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend into nginx html root
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
