#!/bin/bash

# Setup Git hooks for conventional commits
echo "🔧 Setting up Git hooks for conventional commits..."

# Copy commit-msg hook to git hooks directory
cp .github/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg

echo "✅ Git hooks installed!"
echo "📖 Your commit messages will now be validated."
echo "📋 Read VERSIONING.md for commit message format guide."