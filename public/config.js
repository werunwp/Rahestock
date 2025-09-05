// Configuration for Hostinger deployment
// Update these values with your actual Supabase credentials

window.APP_CONFIG = {
  SUPABASE_URL: "https://supabase.akhiyanbd.com",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY_HERE", // Replace with your actual key
  APP_ENV: "production"
};

// Log configuration (remove in production)
console.log('App Configuration Loaded:', {
  url: window.APP_CONFIG.SUPABASE_URL,
  key: window.APP_CONFIG.SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  env: window.APP_CONFIG.APP_ENV
});
