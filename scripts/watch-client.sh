#!/bin/bash

# Watch React files and rebuild on changes
echo "🔍 Watching React files for changes..."

# Install fswatch if not available (macOS)
if ! command -v fswatch &> /dev/null; then
    echo "Installing fswatch..."
    brew install fswatch
fi

# Initial build
echo "🔨 Initial client build..."
cd cmd/client && npm run build && cd ../..

# Watch for changes in React source files
fswatch -o cmd/client/src cmd/client/public cmd/client/index.html cmd/client/package.json cmd/client/vite.config.ts cmd/client/tailwind.config.js cmd/client/tsconfig.json | while read f; do
    echo "📦 React files changed, rebuilding..."
    cd cmd/client && npm run build && cd ../..
    echo "✅ Client rebuild complete"
done