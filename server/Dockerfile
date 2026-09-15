# PERSONAL-1 · deploy · DEV байршуулалт · 2026-09-15
# Runtime хамаарал ЗЭРЭГ (зөвхөн devDependencies) — npm install шаардлагагүй,
# node builtin (node:sqlite) + shared/core-оор ажиллана.
FROM node:22-alpine

WORKDIR /repo
COPY shared ./shared
COPY server/src ./server/src
COPY server/package.json ./server/package.json

WORKDIR /repo/server
ENV PORT=8787
ENV DB_FILE=/data/editors-ascension.sqlite
VOLUME /data
EXPOSE 8787

CMD ["node", "--experimental-strip-types", "src/index.ts"]
