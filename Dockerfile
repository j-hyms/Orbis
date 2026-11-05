FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Les avertissements et la configuration sont stockés ici : montez un volume pour les conserver.
VOLUME ["/app/data"]

CMD ["sh", "-c", "node src/deploy-commands.js && node src/index.js"]
