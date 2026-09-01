ARG NODE_VERSION=22.23.2
FROM node:${NODE_VERSION}-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next analyzes the Payload config while compiling. These values exist only
# for this command and are deliberately non-secret placeholders; dynamic
# routes prevent build-time database reads.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
  PAYLOAD_SECRET=build-time-placeholder-not-for-runtime \
  SITE_URL=http://127.0.0.1:3000 \
  NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
  NEXT_TELEMETRY_DISABLED=1 \
  pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=10000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

# Keep the Payload CLI, config, and committed migrations in the runtime image.
# Free Render staging migrates on startup; paid environments can move this
# command to Render's safer pre-deploy phase and override the Docker command.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 10000

CMD ["sh", "-c", "./node_modules/.bin/payload migrate && exec node server.js"]
