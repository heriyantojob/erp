# Gunakan base image Debian Slim (lebih stabil untuk library native)
FROM node:22-slim

# Set working directory
WORKDIR /usr/src/app

# Install dependensi sistem yang dibutuhkan oleh node-canvas di Debian
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json dan lock file
COPY package*.json ./

# Install dependencies (sekarang kompilasi canvas akan lebih lancar)
RUN npm install --include=optional sharp

# Copy sisa source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port aplikasi
EXPOSE 4000

# Jalankan aplikasi
CMD ["node", "dist/index.js"]
