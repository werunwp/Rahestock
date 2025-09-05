# Coolify Deployment Script for Windows PowerShell
# This script helps prepare your app for Coolify deployment

Write-Host "🚀 Preparing app for Coolify deployment..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the app
Write-Host "🔨 Building the app..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: Build failed. dist folder not found." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host "📁 dist folder created with the following contents:" -ForegroundColor Cyan
Get-ChildItem -Path "dist" | Format-Table Name, Length, LastWriteTime

Write-Host ""
Write-Host "🎯 Next steps for Coolify:" -ForegroundColor Magenta
Write-Host "1. Go to your Coolify dashboard" -ForegroundColor White
Write-Host "2. Create a new project from your GitHub repository" -ForegroundColor White
Write-Host "3. Set these environment variables:" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_URL=https://supabase.akhiyanbd.com" -ForegroundColor Gray
Write-Host "   - VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here" -ForegroundColor Gray
Write-Host "4. Set build command: npm run build" -ForegroundColor White
Write-Host "5. Set output directory: dist" -ForegroundColor White
Write-Host "6. Deploy!" -ForegroundColor White

Write-Host ""
Write-Host "🌐 Your app will be available at your domain after deployment!" -ForegroundColor Green
