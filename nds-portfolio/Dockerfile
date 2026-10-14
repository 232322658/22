FROM node:20-slim
WORKDIR /app
COPY server/package*.json server/
RUN cd server && (npm ci --omit=dev || npm install --omit=dev)
COPY server server
COPY web web
COPY admin admin
ENV PORT=3000 HOST=0.0.0.0 DATA_DIR=/app/data NODE_ENV=production
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server/index.js"]
