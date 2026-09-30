FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY server/package.json ./server/package.json
RUN npm ci
COPY server ./server
RUN npm run prisma:generate --workspace @campusai/server \
  && npm run build --workspace @campusai/server

FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/public ./server/public
USER node
EXPOSE 5000
CMD ["npm", "--workspace", "@campusai/server", "run", "start"]
