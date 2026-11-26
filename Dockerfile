FROM node:26-alpine

ARG APP_VERSION=1.0.0
ARG GIT_SHA=local
ARG BUILD_TIME=unknown

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME}

WORKDIR /app

# Abhängigkeiten zuerst installieren (optimales Layer-Caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Anwendungscode kopieren und Besitz auf Non-Root-Benutzer setzen
COPY src ./src
RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
