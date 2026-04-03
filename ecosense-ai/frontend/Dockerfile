# ===========================================
# EcoSense AI — Frontend Dockerfile
# Node 20 + Vite dev server
# ===========================================

FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
