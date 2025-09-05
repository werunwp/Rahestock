#!/bin/bash

# Coolify Deployment Script
# This script helps prepare your app for Coolify deployment

echo "🚀 Preparing app for Coolify deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the app
echo "🔨 Building the app..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist folder not found."
    exit 1
fi

echo "✅ Build successful!"
echo "📁 dist folder created with the following contents:"
ls -la dist/

echo ""
echo "🎯 Next steps for Coolify:"
echo "1. Go to your Coolify dashboard"
echo "2. Create a new project from your GitHub repository"
echo "3. Set these environment variables:"
echo "   - VITE_SUPABASE_URL=https://supabase.akhiyanbd.com"
echo "   - VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here"
echo "4. Set build command: npm run build"
echo "5. Set output directory: dist"
echo "6. Deploy!"

echo ""
echo "🌐 Your app will be available at your domain after deployment!"
