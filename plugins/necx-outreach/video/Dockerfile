# NECX Video render server (server/server.mjs). Build from this folder:
#   docker build -t necx-video .
#   docker run -d -p 8080:8080 -v necx-video-data:/data \
#     -e PUBLIC_URL=https://video.example.org -e ACCESS_TOKENS=<openssl rand -hex 24> \
#     -e ELEVENLABS_API_KEY=... necx-video
FROM node:22-bookworm-slim

# libraries Remotion's headless Chrome needs on Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      ca-certificates fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npx remotion browser ensure
COPY . .
# the server writes voice clips into public/run and jobs/videos into /data
RUN mkdir -p /data /app/public/run && chown -R node:node /data /app/public/run

ENV PORT=8080 DATA_DIR=/data NODE_ENV=production
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "--no-warnings", "server/server.mjs"]
