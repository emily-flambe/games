.PHONY: install dev run clean

# Install dependencies
install:
	npm install

# Run the development server (alias for dev)
dev:
	@echo "🔍 Checking for processes on port 8777..."
	@lsof -ti:8777 | xargs kill -9 2>/dev/null || echo "Port 8777 is free"
	@echo "🚀 Starting Node.js development server..."
	node dev-server.js

# Run the development server
run: dev

# Clean build artifacts
clean:
	rm -rf node_modules/