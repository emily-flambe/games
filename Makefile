.PHONY: install build run clean test

# Install dependencies
install:
	npm install

# Build the project
build:
	npm run build

# Run the development server
run:
	npm run dev

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf node_modules/.cache/
	rm -f src/static/bundle.js

# Run tests
test:
	npm run test:integration

# Help command
help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make build    - Build the project"
	@echo "  make run      - Run development server"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make test     - Run integration tests"