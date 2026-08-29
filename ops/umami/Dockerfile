# Keep the upstream application immutable while bootstrapping a restricted
# staging-only database role before handing control to Umami.
FROM ghcr.io/umami-software/umami:3.3.1@sha256:fa32d116cf20cad52cbc3fad9a63b46e7fa02299d8f967168eb453d49c476b4a

USER root
COPY --chown=root:root ops/umami/package.json ops/umami/pnpm-lock.yaml /opt/saberistic/
RUN test "$(id -u nextjs)" = "1001" \
    && test "$(id -g nextjs)" = "65533" \
    && pnpm install --dir /opt/saberistic --prod --ignore-scripts --frozen-lockfile
COPY --chown=root:root ops/umami/entrypoint.mjs /opt/saberistic/umami-entrypoint.mjs

ENTRYPOINT ["node", "/opt/saberistic/umami-entrypoint.mjs"]
CMD ["sh", "scripts/start-docker.sh"]
