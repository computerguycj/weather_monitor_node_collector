FROM node:20-bullseye

WORKDIR /app

COPY . .

# Install Chromium and dependencies
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

RUN npm install

CMD ["node", "app.js"]
