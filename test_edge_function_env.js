import { createClient } from '@supabase/supabase-js';

// Test Edge Function environment configuration
const SUPABASE_URL = 'https://supabase.akhiyanbd.com/';

// Test with different keys to see which one works
const keys = [
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTc3OTgyMCwiZXhwIjo0OTExNDUzNDIwLCJyb2xlIjoiYW5vbiJ9.5CgjASpcB28n4UP1nrKmAP6_ODBJwpjgKy7_yhQZBxc', // Anon key
    // Add your service role key here if you have it
];

async function testEdgeFunctionEnvironment() {
    console.log('🔍 Testing Edge Function Environment...\n');

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        console.log(`\n${i + 1}️⃣ Testing with key ${i + 1}...`);
        
        try {
            const supabase = createClient(SUPABASE_URL, key);
            
            // Test admin operations (what the Edge Function needs)
            console.log('   Testing admin role query...');
            const { data: adminRole, error: adminError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('role', 'admin')
                .limit(1);
            
            if (adminError) {
                console.error('   ❌ Admin role query failed:', adminError.message);
            } else {
                console.log('   ✅ Admin role query successful:', adminRole);
            }

            // Test user deletion capability (what the Edge Function needs)
            console.log('   Testing user deletion capability...');
            const { data: users, error: usersError } = await supabase
                .from('user_roles')
                .select('user_id, created_at')
                .eq('role', 'admin')
                .order('created_at', { ascending: true });
            
            if (usersError) {
                console.error('   ❌ Users listing failed:', usersError.message);
            } else {
                console.log('   ✅ Users listing successful:', users);
            }

            // Test table deletion capability
            console.log('   Testing table deletion capability...');
            const { data: salesCount, error: salesError } = await supabase
                .from('sales')
                .select('id', { count: 'exact' });
            
            if (salesError) {
                console.error('   ❌ Sales table access failed:', salesError.message);
            } else {
                console.log('   ✅ Sales table accessible, count:', salesCount?.length || 0);
            }

        } catch (error) {
            console.error('   ❌ Test failed:', error.message);
        }
    }

    console.log('\n🔍 Edge Function Environment Test Complete');
    console.log('\n💡 If all tests fail, the issue is likely:');
    console.log('   1. Service role key not configured in Edge Function');
    console.log('   2. RLS policies blocking service role access');
    console.log('   3. Missing table permissions for service role');
}

// Run the test
testEdgeFunctionEnvironment();
