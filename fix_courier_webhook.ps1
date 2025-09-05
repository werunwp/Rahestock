# Fix Courier Webhook Settings
# This script will apply the SQL fixes to resolve courier status check issues

Write-Host "Fixing courier webhook settings..." -ForegroundColor Green

# Navigate to the SQL file
$sqlFile = "fix_courier_webhook_settings.sql"

if (Test-Path $sqlFile) {
    Write-Host "SQL file found: $sqlFile" -ForegroundColor Yellow
    Write-Host "Please copy and paste the contents of this file into your Supabase SQL Editor" -ForegroundColor Cyan
    Write-Host "Or run the following command in Supabase:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://supabase.akhiyanbd.com/project/default/sql/new" -ForegroundColor White
    Write-Host "2. Copy the contents of fix_courier_webhook_settings.sql" -ForegroundColor White
    Write-Host "3. Paste and run the SQL" -ForegroundColor White
    Write-Host ""
    Write-Host "After running the SQL, you need to:" -ForegroundColor Yellow
    Write-Host "1. Get your Pathao access token from the Pathao developer portal" -ForegroundColor White
    Write-Host "2. Update the auth_username field in courier_webhook_settings table" -ForegroundColor White
    Write-Host "3. Test the courier status check functionality" -ForegroundColor White
} else {
    Write-Host "SQL file not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
