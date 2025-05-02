# Extractinator full-stack Dockerfile
# This builds and runs both backend and frontend, with all dependencies (7z, p7zip-rar, Node, etc.)

FROM ubuntu:22.04 AS base

# Install Node.js (v20.x), 7z, rar, and build tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    p7zip-full p7zip-rar \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Create extraction directories for mounting
RUN mkdir -p /extraction/input /extraction/output

# Create extractinator user with UID/GID 1000
RUN groupadd -g 1000 extractinator && useradd -m -u 1000 -g 1000 extractinator
RUN chown -R extractinator:extractinator /extraction/input /extraction/output

WORKDIR /app

# Copy backend and frontend source
COPY ./apps/backend ./apps/backend
COPY ./apps/frontend ./apps/frontend
COPY package*.json ./

# Install backend dependencies
WORKDIR /app/apps/backend
RUN npm install --omit=dev

# Install frontend dependencies and build
WORKDIR /app/apps/frontend
RUN npm install && npm run build

# Expose only the frontend (web UI) port
EXPOSE 5574

# Production run: start backend and serve static frontend
WORKDIR /app
COPY ./start.sh ./start.sh
RUN chmod +x ./start.sh
USER extractinator
CMD ["./start.sh"]
