#!/bin/bash

echo "🚀 Quick Migration Script: Hosted Supabase → Self-Hosted Supabase"
echo "================================================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if required packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing required packages..."
    npm install pg dotenv
fi

echo "✅ Prerequisites check completed"
echo ""

echo "📋 Next steps:"
echo "1. Copy env.example to .env.local and update with your local Supabase details"
echo "2. Copy env.migration.example to .env.migration and update with your hosted Supabase password"
echo "3. Start your local Supabase: cd supabase && npx supabase start"
echo "4. Run the migration: node migrate_data.js"
echo "5. Update your app configuration"
echo ""

echo "🔧 Quick commands:"
echo "  cd supabase && npx supabase start    # Start local Supabase"
echo "  node migrate_data.js                 # Run data migration"
echo "  npm run dev                          # Start your app"
echo ""

echo "📚 For detailed instructions, see: migrate_to_self_hosted.md"
echo ""

echo "🎯 Ready to migrate? Let's go!"

