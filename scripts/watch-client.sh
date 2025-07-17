#!/bin/bash

# Watch React files and rebuild on changes
echo "🔍 Watching React files for changes..."

# Get the absolute path of the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/cmd/client"

# Install fswatch if not available (macOS)
if ! command -v fswatch &> /dev/null; then
    echo "Installing fswatch..."
    brew install fswatch
fi

# Initial build
echo "🔨 Initial client build..."
cd "$CLIENT_DIR" && npm run build

# Watch for changes in React source files
fswatch -o "$CLIENT_DIR/src" "$CLIENT_DIR/public" "$CLIENT_DIR/index.html" "$CLIENT_DIR/package.json" "$CLIENT_DIR/vite.config.ts" "$CLIENT_DIR/tailwind.config.js" "$CLIENT_DIR/tsconfig.json" | while read f; do
    echo "📦 React files changed, rebuilding..."
    cd "$CLIENT_DIR" && npm run build
    echo "✅ Client rebuild complete"
done
