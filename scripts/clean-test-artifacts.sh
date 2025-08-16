#!/bin/bash

# UNSKIPPABLE CLEANUP SCRIPT - Run after EVERY test session
# This script ensures all testing artifacts are removed immediately

echo "Cleaning up testing artifacts..."

# Remove all test files
rm -f test-*.js
rm -f test-*.html
rm -f test-*.json

# Remove all debug files
rm -f debug-*.js
rm -f debug-*.html
rm -f debug-*.json

# Remove all screenshots
rm -f *.png
rm -f *.webp
rm -f screenshot*.*
rm -f frame_*.*

# Remove all simple/temporary files
rm -f simple-*.js
rm -f simple-*.html
rm -f *-fix.js
rm -f *-actual-fix.*
rm -f *-verification.*

# Remove production test artifacts
rm -f production-*.js
rm -f production-*.png
rm -rf production-test/

# Check if anything remains
REMAINING=$(git status --porcelain | grep -E "(test-|debug-|simple-|\.png$|\.webp$)" | wc -l)

if [ $REMAINING -eq 0 ]; then
    echo "All testing artifacts removed successfully!"
    echo "Current status:"
    git status --short
else
    echo "Warning: Some artifacts may remain:"
    git status --porcelain | grep -E "(test-|debug-|simple-|\.png$|\.webp$)"
    echo ""
    echo "Run 'git status' to review and remove manually"
fi

echo ""
echo "Remember: ALWAYS run this script IMMEDIATELY after testing!"
echo "Within 30 seconds of test completion!"
