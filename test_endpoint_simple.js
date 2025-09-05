// 🧪 Simple Endpoint Test (No Auth Required)
// This will check if your Edge Function endpoint exists

const SUPABASE_URL = 'https://supabase.akhiyanbd.com';
const FUNCTION_NAME = 'reset-app';

async function testEndpointSimple() {
    console.log('🧪 Testing Edge Function Endpoint (Simple Check)\n');
    
    try {
        // Test 1: Check if the function endpoint responds
        console.log('1️⃣ Testing function endpoint availability...');
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}`);
        
        // Check response headers
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        console.log('   Headers:', headers);
        
        // Interpret the status
        if (response.status === 405) {
            console.log('   ✅ Function endpoint EXISTS! (Method Not Allowed is expected for GET)');
            console.log('   🎉 Your Edge Function is running and accessible');
        } else if (response.status === 404) {
            console.log('   ❌ Function endpoint NOT FOUND');
            console.log('   💡 The function might not be deployed or the URL is wrong');
        } else if (response.status === 401) {
            console.log('   🔒 Function endpoint EXISTS but requires authentication');
            console.log('   🎉 Your Edge Function is running and accessible');
        } else if (response.status === 500) {
            console.log('   ⚠️ Function endpoint EXISTS but has internal errors');
            console.log('   🔧 The function is deployed but needs fixing');
        } else {
            console.log('   ⚠️ Unexpected status, but function might exist');
        }
        
        // Test 2: Try to get response body for more info
        try {
            const responseText = await response.text();
            if (responseText) {
                console.log('   Response body:', responseText.substring(0, 200) + '...');
            }
        } catch (e) {
            console.log('   Could not read response body');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('fetch')) {
            console.log('   💡 This might mean:');
            console.log('      - Function endpoint doesn\'t exist');
            console.log('      - CORS issues');
            console.log('      - Network connectivity problems');
        }
    }
    
    console.log('\n🔍 Endpoint Test Complete');
    console.log('\n💡 Next steps:');
    if (response && response.status === 405) {
        console.log('   ✅ Your Edge Function is working!');
        console.log('   🔑 Now you need to get a JWT token to test it properly');
        console.log('   📱 Try the enhanced_token_finder.js script in your browser console');
    } else if (response && response.status === 404) {
        console.log('   ❌ Edge Function not found');
        console.log('   🔧 Check your Coolify dashboard for function deployment');
        console.log('   📁 Verify the function files are in the right location');
    } else {
        console.log('   ⚠️ Function status unclear');
        console.log('   🔍 Check your Coolify dashboard and function logs');
    }
}

// Run the test
testEndpointSimple();
