# Quick Migration Script: Hosted Supabase → Self-Hosted Supabase
# Run this in PowerShell

Write-Host "🚀 Quick Migration Script: Hosted Supabase → Self-Hosted Supabase" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

# Check if required packages are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing required packages..." -ForegroundColor Yellow
    npm install pg dotenv
}

Write-Host "✅ Prerequisites check completed" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy env.example to .env.local and update with your local Supabase details" -ForegroundColor White
Write-Host "2. Copy env.migration.example to .env.migration and update with your hosted Supabase password" -ForegroundColor White
Write-Host "3. Start your local Supabase: cd supabase; npx supabase start" -ForegroundColor White
Write-Host "4. Run the migration: node migrate_data.js" -ForegroundColor White
Write-Host "5. Update your app configuration" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Quick commands:" -ForegroundColor Yellow
Write-Host "  cd supabase; npx supabase start    # Start local Supabase" -ForegroundColor White
Write-Host "  node migrate_data.js               # Run data migration" -ForegroundColor White
Write-Host "  npm run dev                        # Start your app" -ForegroundColor White
Write-Host ""

Write-Host "📚 For detailed instructions, see: migrate_to_self_hosted.md" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Ready to migrate? Let's go!" -ForegroundColor Green

