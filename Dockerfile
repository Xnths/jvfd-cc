# --- Base Stage ---
FROM --platform=$BUILDPLATFORM node:lts AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# --- Dependencies Stage ---
FROM base AS dependencies
COPY . /app
RUN pnpm install

ENV NEXT_TELEMETRY_DISABLED=1
ENV ESBUILD_FORCE_BINARY_DOWNLOAD=true
ENV NODE_ENV=production

# --- Development Stage ---
FROM dependencies AS development
ENV NODE_ENV=development
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# --- Production Build Stage ---
FROM dependencies AS builder

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

COPY . .

RUN pnpm build

# --- Production Stage ---
FROM --platform=$TARGETPLATFORM node:lts AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV ESBUILD_FORCE_BINARY_DOWNLOAD=true

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

# Copiar apenas o necessário
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN pnpm install --prod --frozen-lockfile  --ignore-scripts

# Entrypoint para iniciar Next.js em modo produção
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

CMD ["sh", "/entrypoint.sh"]
