FROM node:20-bullseye

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y \
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
