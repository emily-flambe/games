.PHONY: install build dev run test deploy clean

# Install dependencies
install:
	npm install

# Build static assets for Cloudflare Worker
build:
	@echo "🔨 Building static assets..."
	npm run build

# Run the development server (alias for dev)
dev:
	@echo "🔍 Checking for processes on port 8777..."
	@lsof -ti:8777 | xargs kill -9 2>/dev/null || echo "Port 8777 is free"
	@echo "🚀 Starting Node.js development server..."
	node scripts/dev-server.js

# Run the development server
run: dev

# Run all tests
test:
	@echo "🧪 Running tests..."
	npm test

# Deploy to Cloudflare Workers
deploy:
	@echo "🚀 Deploying to Cloudflare Workers..."
	npm run deploy

# Clean build artifacts
clean:
	rm -rf node_modules/
	rm -rf src/lib/