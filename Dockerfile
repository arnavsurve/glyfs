# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY cmd/client/package*.json ./cmd/client/
COPY cmd/docs-site/package*.json ./cmd/docs-site/

# Install system dependencies for Playwright and git for Vocs
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git

# Set Playwright to use system chromium and skip browser downloads
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dependencies for both client and docs-site
RUN cd cmd/client && npm ci
RUN cd cmd/docs-site && npm ci

COPY cmd/client/ ./cmd/client/
COPY cmd/docs-site/ ./cmd/docs-site/

# Initialize minimal git repo for Vocs (it just needs git to exist)
RUN git init . && \
    git config --global user.email "build@docker.com" && \
    git config --global user.name "Docker Build" && \
    git add . && \
    git commit -m "Initial commit for build"

# Build from client directory (which will also build docs)
WORKDIR /app/cmd/client
RUN npm run build

# Build backend
FROM golang:1.24-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Final runtime image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=backend-builder /app/server .

COPY --from=frontend-builder /app/cmd/client/dist ./cmd/client/dist

EXPOSE 8080

ENV PORT=8080

CMD ["./server"]
