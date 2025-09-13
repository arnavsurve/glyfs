# Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY cmd/client/package*.json ./cmd/client/
COPY cmd/docs/package*.json ./cmd/docs/

# Install dependencies for client and docs
RUN cd cmd/client && npm ci
RUN cd cmd/docs && npm ci

COPY cmd/client/ ./cmd/client/
COPY cmd/docs/ ./cmd/docs/

# Build client application (which will also build docs)
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
