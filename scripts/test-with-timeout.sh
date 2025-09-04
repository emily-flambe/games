#!/bin/bash

# Script to run tests with proper timeout handling
# Prevents tests from hanging indefinitely

echo "Running unit tests..."
npm run test:unit

if [ $? -ne 0 ]; then
    echo "Unit tests failed"
    exit 1
fi

echo ""
echo "Running browser tests (with timeout)..."
echo "Note: Browser tests require dev server running on port 8777"

# Use gtimeout on macOS (install with brew install coreutils) or timeout on Linux
if command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &> /dev/null; then
    TIMEOUT_CMD="timeout"
else
    echo "Warning: timeout command not found. Tests may hang."
    echo "On macOS, install with: brew install coreutils"
    npm run test:browser
    exit $?
fi

# Run browser tests with 30 second timeout
$TIMEOUT_CMD 30 npm run test:browser

EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo ""
    echo "⚠️  Browser tests timed out after 30 seconds"
    echo "This usually means:"
    echo "1. The dev server isn't running (run 'npm run dev' first)"
    echo "2. WebSocket connections aren't working properly"
    echo "3. Tests are waiting for elements that don't exist"
    echo ""
    echo "To debug, run: npm run test:browser -- --verbose"
    exit 1
elif [ $EXIT_CODE -ne 0 ]; then
    echo "Browser tests failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi

echo "All tests passed!"