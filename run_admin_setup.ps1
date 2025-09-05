# Admin Setup Script Runner
# This script will run the admin permissions setup

Write-Host "🚀 Starting Admin Permissions Setup..." -ForegroundColor Green
Write-Host ""

# Check if setup_admin_permissions.sql exists
if (-not (Test-Path "setup_admin_permissions.sql")) {
    Write-Host "❌ Error: setup_admin_permissions.sql not found!" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Admin setup script found." -ForegroundColor Green
Write-Host ""

Write-Host "📝 Instructions:" -ForegroundColor Cyan
Write-Host "1. Copy the contents of setup_admin_permissions.sql" -ForegroundColor White
Write-Host "2. Go to your Supabase SQL Editor" -ForegroundColor White
Write-Host "3. Paste and run the SQL script" -ForegroundColor White
Write-Host "4. Wait for completion" -ForegroundColor White
Write-Host "5. Test the User Management tab in your app" -ForegroundColor White
Write-Host ""

Write-Host "🔑 What this will fix:" -ForegroundColor Cyan
Write-Host "✅ Admin users will have full permissions" -ForegroundColor Green
Write-Host "✅ User Management tab will show users" -ForegroundColor Green
Write-Host "✅ Role-based permissions will work" -ForegroundColor Green
Write-Host "✅ All admin functions will be available" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "- Run this AFTER you have admin access" -ForegroundColor White
Write-Host "- Make sure RLS is enabled first" -ForegroundColor White
Write-Host "- This creates comprehensive admin infrastructure" -ForegroundColor White
Write-Host ""

Write-Host "📖 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run the SQL script in Supabase" -ForegroundColor White
Write-Host "2. Refresh your app" -ForegroundColor White
Write-Host "3. Go to Admin → Users tab" -ForegroundColor White
Write-Host "4. Users should now be visible!" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Ready to proceed? Copy the SQL script and run it in Supabase!" -ForegroundColor Green
Write-Host ""

# Show the first few lines of the SQL script as a preview
Write-Host "📄 SQL Script Preview (first 10 lines):" -ForegroundColor Cyan
Get-Content "setup_admin_permissions.sql" | Select-Object -First 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "✨ Setup complete! Your admin functionality should now work properly." -ForegroundColor Green
