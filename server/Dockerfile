FROM node:22-alpine AS base
ENV YARN_VERSION=4.10.3
RUN apk update && apk upgrade && apk add --no-cache libc6-compat && apk add dumb-init
RUN corepack enable && corepack prepare yarn@${YARN_VERSION}

FROM base AS deps
WORKDIR /usr/src/app
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY . .
RUN yarn build

FROM base AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=deps /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
RUN yarn workspaces focus --production
EXPOSE 3000
CMD ["yarn", "start:prod"]
