#!/bin/bash

# Setup Git hooks for conventional commits
echo "🔧 Setting up Git hooks for conventional commits..."

# Check if hooks directory exists
if [ ! -d "hooks" ]; then
    echo "❌ Error: hooks/ directory not found!"
    exit 1
fi

# Copy commit-msg hook to git hooks directory
cp hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg

echo "✅ Git hooks installed!"
echo "📖 Your commit messages will now be validated."
echo "📋 Read VERSIONING.md for commit message format guide."
echo ""
echo "ℹ️  Note: This is optional. You can also enforce commit standards via PR rules."