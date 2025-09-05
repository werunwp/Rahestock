// 🔑 Get JWT Token from Your App
// Run this in your browser console after logging into your app

console.log('🔑 JWT Token Extractor for Edge Function Testing\n');

// Method 1: Check localStorage
console.log('1️⃣ Checking localStorage for JWT token...');
const localToken = localStorage.getItem('sb-supabase-token') || 
                   localStorage.getItem('supabase.auth.token') ||
                   localStorage.getItem('authToken');

if (localToken) {
    console.log('   ✅ Found token in localStorage:', localToken);
} else {
    console.log('   ❌ No token found in localStorage');
}

// Method 2: Check sessionStorage
console.log('\n2️⃣ Checking sessionStorage for JWT token...');
const sessionToken = sessionStorage.getItem('sb-supabase-token') || 
                     sessionStorage.getItem('supabase.auth.token') ||
                     sessionStorage.getItem('authToken');

if (sessionToken) {
    console.log('   ✅ Found token in sessionStorage:', sessionToken);
} else {
    console.log('   ❌ No token found in sessionStorage');
}

// Method 3: Check for Supabase client
console.log('\n3️⃣ Checking for Supabase client...');
if (window.supabase) {
    console.log('   ✅ Supabase client found');
    
    // Try to get current session
    window.supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.log('   ❌ Error getting session:', error);
        } else if (data.session) {
            console.log('   ✅ Current session found');
            console.log('   🔑 Access token:', data.session.access_token);
            console.log('   👤 User ID:', data.session.user.id);
            
            // Copy to clipboard for easy use
            navigator.clipboard.writeText(data.session.access_token).then(() => {
                console.log('   📋 Access token copied to clipboard!');
            });
        } else {
            console.log('   ❌ No active session');
        }
    });
} else {
    console.log('   ❌ Supabase client not found');
}

// Method 4: Check all storage for any JWT-like tokens
console.log('\n4️⃣ Scanning all storage for JWT tokens...');
const allStorage = { ...localStorage, ...sessionStorage };
const jwtPattern = /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;

for (const [key, value] of Object.entries(allStorage)) {
    if (jwtPattern.test(value)) {
        console.log(`   🔑 Found JWT token in ${key}:`, value);
    }
}

console.log('\n🎯 Instructions:');
console.log('1. Copy the access token from above');
console.log('2. Use it in the test_edge_function_direct.js script');
console.log('3. Replace YOUR_JWT_TOKEN_HERE with the copied token');
console.log('4. Replace YOUR_USER_ID_HERE with your user ID');
console.log('5. Test your Edge Function!');

// Helper function to extract user ID
console.log('\n🆔 To get your User ID:');
console.log('1. Look for "User ID:" in the output above');
console.log('2. Or check your app\'s user profile/settings');
console.log('3. Or look in the browser\'s Network tab when making requests');
