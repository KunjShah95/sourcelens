# SourceLens — zero-dependency Node image.
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app

# No npm install: the app has no runtime dependencies.
COPY package.json ./
COPY server.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
COPY supabase ./supabase

# Run as an unprivileged user. /app/data is only used in local SQLite mode.
RUN addgroup -S sourcelens && adduser -S sourcelens -G sourcelens \
    && mkdir -p /app/data && chown -R sourcelens:sourcelens /app
USER sourcelens

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--no-warnings", "server.js"]
