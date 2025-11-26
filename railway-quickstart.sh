#!/bin/bash
# Quick start script for Railway deployment
# This script helps set up environment variables for Railway

set -e

echo "🚂 Railway Deployment Quick Start"
echo "=================================="
echo ""

# Check if JWT keys exist
if [ ! -f "server/keys/jwt-private.pem" ] || [ ! -f "server/keys/jwt-public.pem" ]; then
    echo "⚠️  JWT keys not found. Generating them now..."
    make generate-jwt-keys
    echo "✅ JWT keys generated"
    echo ""
fi

# Generate base64 encoded keys
echo "📋 Generating base64-encoded JWT keys for Railway..."
echo ""
JWT_PRIVATE_KEY=$(cat server/keys/jwt-private.pem | base64 -w 0 2>/dev/null || cat server/keys/jwt-private.pem | base64)
JWT_PUBLIC_KEY=$(cat server/keys/jwt-public.pem | base64 -w 0 2>/dev/null || cat server/keys/jwt-public.pem | base64)

echo "Add these to your Railway environment variables:"
echo ""
echo "JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY"
echo ""
echo "JWT_PUBLIC_KEY=$JWT_PUBLIC_KEY"
echo ""
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Create a Railway project at https://railway.app"
echo "2. Add a PostgreSQL database"
echo "3. Set the environment variables (see RAILWAY.md for full list)"
echo "4. Deploy from GitHub or using Railway CLI"
echo ""
echo "For detailed instructions, see RAILWAY.md"

