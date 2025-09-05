import fetch from 'node-fetch';

// Test Edge Function directly via HTTP
const SUPABASE_URL = 'https://supabase.akhiyanbd.com';
const FUNCTION_NAME = 'reset-app';

async function testEdgeFunctionDirect() {
    console.log('🔍 Testing Edge Function Direct Access...\n');
    
    try {
        // First, let's check if the function endpoint exists
        console.log('1️⃣ Testing function endpoint availability...');
        const healthCheck = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Status: ${healthCheck.status}`);
        console.log(`   Headers:`, Object.fromEntries(healthCheck.headers.entries()));
        
        if (healthCheck.status === 405) {
            console.log('   ✅ Function endpoint exists (Method Not Allowed is expected for GET)');
        } else if (healthCheck.status === 404) {
            console.log('   ❌ Function endpoint not found');
            return;
        } else {
            console.log('   ⚠️ Unexpected status, but function might exist');
        }
        
        // Now test with a POST request (what the function expects)
        console.log('\n2️⃣ Testing function with POST request...');
        
        // You'll need to get a valid JWT token from your app
        console.log('   Note: You need a valid JWT token to test this function');
        console.log('   Get it from your app after logging in');
        
        // Example of how to call it (replace with actual token)
        const testCall = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'YOUR_USER_ID_HERE'
            })
        });
        
        console.log(`   POST Status: ${testCall.status}`);
        
        if (testCall.status === 401) {
            console.log('   ⚠️ Unauthorized - need valid JWT token');
        } else if (testCall.status === 200) {
            console.log('   ✅ Function is working!');
            const response = await testCall.json();
            console.log('   Response:', response);
        } else {
            console.log('   ❌ Function error:', testCall.status);
            const errorText = await testCall.text();
            console.log('   Error details:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    console.log('\n🔍 Edge Function Direct Test Complete');
    console.log('\n💡 Next steps:');
    console.log('   1. Get a valid JWT token from your app');
    console.log('   2. Replace YOUR_JWT_TOKEN_HERE with the actual token');
    console.log('   3. Replace YOUR_USER_ID_HERE with your actual user ID');
    console.log('   4. Run this test again');
}

// Run the test
testEdgeFunctionDirect();
