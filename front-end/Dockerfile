FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build -- --configuration production --output-path=dist/demo

FROM nginx:stable-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY nginx.demo.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/demo/browser /usr/share/nginx/html
