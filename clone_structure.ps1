# Clone Supabase Structure Script
# This script clones only the database structure (tables, schemas, functions) without data

Write-Host "🚀 Supabase Structure Cloning Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if env.migration exists
if (-not (Test-Path "env.migration")) {
    Write-Host "❌ env.migration file not found!" -ForegroundColor Red
    Write-Host "Please create env.migration with your database credentials" -ForegroundColor Yellow
    exit 1
}

# Check if required packages are installed
Write-Host "📦 Checking required packages..." -ForegroundColor Yellow
try {
    $pgCheck = npm list pg
    $dotenvCheck = npm list dotenv
    Write-Host "✅ Required packages are installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Required packages not found. Installing..." -ForegroundColor Yellow
    npm install pg dotenv
}

Write-Host ""
Write-Host "🔑 IMPORTANT: Make sure you have updated env.migration with your hosted Supabase password!" -ForegroundColor Red
Write-Host "📋 Current env.migration contents:" -ForegroundColor Yellow
Get-Content "env.migration" | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "🚀 Starting structure cloning..." -ForegroundColor Green
Write-Host "This will:" -ForegroundColor White
Write-Host "  1. Connect to your hosted Supabase" -ForegroundColor White
Write-Host "  2. Extract table schemas, constraints, indexes, and functions" -ForegroundColor White
Write-Host "  3. Create the same structure on your self-hosted Supabase" -ForegroundColor White
Write-Host "  4. Save the SQL to cloned_structure.sql" -ForegroundColor White

Write-Host ""
$confirm = Read-Host "Press Enter to continue or Ctrl+C to cancel"

Write-Host ""
Write-Host "🔄 Running structure cloning..." -ForegroundColor Yellow
node clone_structure.js

Write-Host ""
Write-Host "🎉 Structure cloning completed!" -ForegroundColor Green
Write-Host "📁 Check cloned_structure.sql for the generated SQL" -ForegroundColor White
Write-Host "🔗 Your app should now work with your self-hosted Supabase" -ForegroundColor White



