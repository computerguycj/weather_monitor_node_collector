# Use a Debian-based Node image for full Puppeteer compatibility
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy your app files
COPY . .

# Install Chromium and required dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libdrm-dev \
    libgbm-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install other dependencies
RUN npm install

# Run your app
CMD ["node", "app.js"]