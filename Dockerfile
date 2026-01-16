# --- Base Stage ---
FROM --platform=$BUILDPLATFORM node:20.6.0 AS base
WORKDIR /app

# Enable Corepack and prepare pnpm with retry
RUN corepack enable && \
    for i in 1 2 3; do \
    corepack prepare pnpm@10.15.0 --activate && break || sleep 5; \
    done

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

# Reinstall in development mode (dev dependencies included)
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# --- Production Build Stage ---
FROM dependencies AS builder

# Firebase build arguments
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# Set environment variables for the build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

COPY . .

# Build the Next.js production bundle
RUN pnpm build

# --- Production Stage ---
FROM --platform=$TARGETPLATFORM node:20.6.0 AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV ESBUILD_FORCE_BINARY_DOWNLOAD=true

# Enable Corepack and pnpm with retry
RUN corepack enable && \
    for i in 1 2 3; do \
    corepack prepare pnpm@10.15.0 --activate && break || sleep 5; \
    done

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
CMD ["sh", "/entrypoint.sh"]
