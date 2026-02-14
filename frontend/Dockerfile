# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Runtime stage - nginx to serve SPA
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
