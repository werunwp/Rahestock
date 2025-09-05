// 🔍 Enhanced JWT Token Finder
// Run this in your browser console after logging into your app

console.log('🔍 Enhanced JWT Token Finder\n');

// Method 1: Check all possible localStorage keys
console.log('1️⃣ Deep localStorage search...');
const localStorageKeys = Object.keys(localStorage);
for (const key of localStorageKeys) {
    const value = localStorage.getItem(key);
    if (value && value.includes('eyJ')) {
        console.log(`   🔑 Found JWT in localStorage.${key}:`, value);
    }
}

// Method 2: Check all possible sessionStorage keys
console.log('\n2️⃣ Deep sessionStorage search...');
const sessionStorageKeys = Object.keys(sessionStorage);
for (const key of sessionStorageKeys) {
    const value = sessionStorage.getItem(key);
    if (value && value.includes('eyJ')) {
        console.log(`   🔑 Found JWT in sessionStorage.${key}:`, value);
    }
}

// Method 3: Check cookies
console.log('\n3️⃣ Checking cookies...');
const cookies = document.cookie.split(';');
for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (value && value.includes('eyJ')) {
        console.log(`   🔑 Found JWT in cookie ${name}:`, value);
    }
}

// Method 4: Check for any global variables
console.log('\n4️⃣ Checking global variables...');
const globalVars = ['supabase', 'auth', 'token', 'session', 'user'];
for (const varName of globalVars) {
    if (window[varName]) {
        console.log(`   ✅ Found global variable: ${varName}`, window[varName]);
    }
}

// Method 5: Check for any script tags with tokens
console.log('\n5️⃣ Checking script tags...');
const scripts = document.querySelectorAll('script');
for (const script of scripts) {
    if (script.textContent && script.textContent.includes('eyJ')) {
        console.log('   🔑 Found JWT in script tag');
        const matches = script.textContent.match(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g);
        if (matches) {
            console.log('   Tokens found:', matches);
        }
    }
}

// Method 6: Check for any data attributes
console.log('\n6️⃣ Checking data attributes...');
const elementsWithData = document.querySelectorAll('[data-*]');
for (const element of elementsWithData) {
    const attrs = element.attributes;
    for (const attr of attrs) {
        if (attr.name.startsWith('data-') && attr.value && attr.value.includes('eyJ')) {
            console.log(`   🔑 Found JWT in ${attr.name}:`, attr.value);
        }
    }
}

// Method 7: Check for any hidden inputs
console.log('\n7️⃣ Checking hidden inputs...');
const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
for (const input of hiddenInputs) {
    if (input.value && input.value.includes('eyJ')) {
        console.log(`   🔑 Found JWT in hidden input ${input.name}:`, input.value);
    }
}

// Method 8: Check for any meta tags
console.log('\n8️⃣ Checking meta tags...');
const metaTags = document.querySelectorAll('meta');
for (const meta of metaTags) {
    if (meta.content && meta.content.includes('eyJ')) {
        console.log(`   🔑 Found JWT in meta ${meta.name}:`, meta.content);
    }
}

// Method 9: Check for any JSON-LD scripts
console.log('\n9️⃣ Checking JSON-LD scripts...');
const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
for (const script of jsonLdScripts) {
    try {
        const data = JSON.parse(script.textContent);
        const jsonString = JSON.stringify(data);
        if (jsonString.includes('eyJ')) {
            console.log('   🔑 Found JWT in JSON-LD script');
        }
    } catch (e) {
        // Ignore parse errors
    }
}

// Method 10: Check for any inline styles with tokens
console.log('\n🔟 Checking inline styles...');
const elementsWithStyle = document.querySelectorAll('[style*="eyJ"]');
for (const element of elementsWithStyle) {
    console.log('   🔑 Found JWT in inline style');
}

console.log('\n🎯 If no JWT found above, try this:');
console.log('1. Go to Network tab in DevTools');
console.log('2. Log in to your app');
console.log('3. Look for API calls with Authorization headers');
console.log('4. Copy the Bearer token from there');

// Helper function to extract user ID from any found token
console.log('\n🆔 To get your User ID:');
console.log('1. Look for any JWT tokens above');
console.log('2. Or check your app\'s user profile/settings');
console.log('3. Or look in the browser\'s Network tab when making requests');
console.log('4. Or check your app\'s user management section');
