# Cost of Regulation (CoR) dashboard — QCI / DPIIT
# Single-container image: Node backend + SQLite (node:sqlite, no native build step) + static frontend.

FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
COPY public ./public

# Seed the database at build time from the committed seed data. Re-running
# `npm run seed` later (e.g. after editing server/db/seed-data*.json) wipes
# and reloads the seeded tables but leaves research_runs/admin untouched.
RUN npm run seed

ENV PORT=3000
EXPOSE 3000

# Required at runtime (see README): ADMIN_USERNAME, ADMIN_PASSWORD,
# SESSION_SECRET, ANTHROPIC_API_KEY. The image intentionally has no defaults
# for these — the container will start but admin login / research will be
# unusable (and clearly log why) until they are set.
CMD ["node", "server/server.js"]
