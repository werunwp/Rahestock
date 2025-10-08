// Configuration for Hostinger deployment
// Update these values with your actual Supabase credentials

window.APP_CONFIG = {
  SUPABASE_URL: "https://supabase.rahedeen.com/", // Updated Supabase URL
  SUPABASE_ANON_KEY: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTc3OTgyMCwiZXhwIjo0OTExNDUzNDIwLCJyb2xlIjoiYW5vbiJ9.5CgjASpcB28n4UP1nrKmAP6_ODBJwpjgKy7_yhQZBxc", // Updated anon key
  APP_ENV: "production"
};

// Log configuration (remove in production)
console.log('App Configuration Loaded:', {
  url: window.APP_CONFIG.SUPABASE_URL,
  key: window.APP_CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  env: window.APP_CONFIG.APP_ENV
});
