#!/bin/bash
set -e

echo "🏗️  Building frontend..."
node build-scripts/build-frontend.js

echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "✅ Deployment complete!"