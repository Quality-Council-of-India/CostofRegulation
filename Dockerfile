# Cost of Regulation (CoR) dashboard — QCI / DPIIT
# Self-hosting alternative to Vercel (see README — Vercel + Neon Postgres is
# the primary, walked-through deployment path for this project).
#
# This image does NOT seed the database at build time, since DATABASE_URL
# points at a real Postgres instance only known at run time, not at image
# build time. Run `npm run seed` once after the container is up and can
# reach its database (e.g. `docker exec <container> npm run seed`).

FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
COPY public ./public

ENV PORT=3000
EXPOSE 3000

# Required at runtime (see README): DATABASE_URL, ADMIN_USERNAME,
# ADMIN_PASSWORD, SESSION_SECRET, ANTHROPIC_API_KEY.
CMD ["node", "server/server.js"]
