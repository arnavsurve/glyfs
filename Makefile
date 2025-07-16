.PHONY: build-client build-server dev clean

# Build React client
build-client:
	cd cmd/client && npm run build

# Build Go server
build-server:
	go build -o bin/server cmd/server/main.go

# Build both client and server
build: build-client build-server

# Development mode - auto-rebuild on changes
dev:
	@echo "Starting development with auto-reload..."
	@echo "Client watcher will rebuild React on file changes"
	@echo "Server watcher will restart Go server on file changes"
	@trap 'kill 0' SIGINT; \
	./scripts/watch-client.sh & \
	air -c .air.toml & \
	wait

# Development mode with separate servers
dev-separate:
	@echo "Starting development servers..."
	@trap 'kill 0' SIGINT; \
	(cd cmd/client && npm run dev) & \
	(air -c .air.toml) & \
	wait

# Production mode - build client and run server with static files
prod: build-client
	ENV=production go run cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf cmd/client/dist
	rm -rf bin/
	rm -rf tmp/

# Install dependencies
install:
	cd cmd/client && npm install
	go mod tidy
