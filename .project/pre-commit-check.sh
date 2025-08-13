#!/bin/bash
# Pre-commit check for troubleshooting artifacts
# Place this in .git/hooks/pre-commit to enable automatic checking

echo "🔍 Checking for troubleshooting artifacts..."

# Check for troubleshooting files that shouldn't be committed
TROUBLESHOOTING_FILES=$(git diff --cached --name-only | grep -E "(test-.*\.(js|html|json)|debug-.*\.(js|html)|.*-fix\.(js|html)|.*-error\.png|.*-test\.png|production-.*\.png|frame_.*\.png|TROUBLESHOOTING\.md|DEPLOYMENT_.*\.md)" || true)

if [ ! -z "$TROUBLESHOOTING_FILES" ]; then
    echo "❌ COMMIT BLOCKED: Troubleshooting artifacts detected!"
    echo ""
    echo "The following files should not be committed:"
    echo "$TROUBLESHOOTING_FILES"
    echo ""
    echo "Please:"
    echo "1. Remove these files from your commit: git reset HEAD <file>"
    echo "2. Move valuable documentation to .project/ directory"
    echo "3. Delete temporary debugging files"
    echo "4. Read .project/DEVELOPMENT_GUIDELINES.md for details"
    echo ""
    exit 1
fi

# Check for PNG files that aren't whitelisted
PNG_FILES=$(git diff --cached --name-only | grep "\.png$" | grep -v "src/static/favicon.png" | grep -v "docs/architecture-" | grep -v "docs/diagrams/" || true)

if [ ! -z "$PNG_FILES" ]; then
    echo "❌ COMMIT BLOCKED: Non-whitelisted PNG files detected!"
    echo ""
    echo "PNG files found:"
    echo "$PNG_FILES"
    echo ""
    echo "Only these PNG files are allowed:"
    echo "- src/static/favicon.png"
    echo "- docs/architecture-*.png"
    echo "- docs/diagrams/*.png"
    echo ""
    echo "Please remove debugging screenshots or move official diagrams to approved locations."
    echo ""
    exit 1
fi

# Check for documentation in root that should be in .project/
ROOT_DOCS=$(git diff --cached --name-only | grep -E "^(DEPLOYMENT_|TROUBLESHOOTING|github-issue-|.*-lessons-learned\.md|.*-best-practices\.md)" || true)

if [ ! -z "$ROOT_DOCS" ]; then
    echo "❌ COMMIT BLOCKED: Documentation in wrong location!"
    echo ""
    echo "These files should be in .project/ directory:"
    echo "$ROOT_DOCS"
    echo ""
    echo "Please move them: mv <file> .project/"
    echo ""
    exit 1
fi

echo "✅ No troubleshooting artifacts detected. Commit allowed."
exit 0