import { createClient } from '@supabase/supabase-js';

// Test the exact queries the Edge Function makes
const SUPABASE_URL = 'https://supabase.akhiyanbd.com/';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTc3OTgyMCwiZXhwIjo0OTExNDUzNDIwLCJyb2xlIjoiYW5vbiJ9.5CgjASpcB28n4UP1nrKmAP6_ODBJwpjgKy7_yhQZBxc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunctionQueries() {
    console.log('🔍 Testing Edge Function Queries...\n');

    try {
        // Test 1: Check user_roles table structure
        console.log('1️⃣ Testing user_roles table access...');
        const { data: userRolesStructure, error: structureError } = await supabase
            .from('user_roles')
            .select('*')
            .limit(1);
        
        if (structureError) {
            console.error('❌ user_roles table error:', structureError);
        } else {
            console.log('✅ user_roles table accessible');
            console.log('   Sample data:', userRolesStructure);
        }

        // Test 2: Check profiles table structure
        console.log('\n2️⃣ Testing profiles table access...');
        const { data: profilesStructure, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
        
        if (profilesError) {
            console.error('❌ profiles table error:', profilesError);
        } else {
            console.log('✅ profiles table accessible');
            console.log('   Sample data:', profilesStructure);
        }

        // Test 3: Test the exact admin role query the Edge Function uses
        console.log('\n3️⃣ Testing admin role query (Edge Function query)...');
        const { data: adminRole, error: adminError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('role', 'admin')
            .limit(1);
        
        if (adminError) {
            console.error('❌ Admin role query error:', adminError);
        } else {
            console.log('✅ Admin role query successful');
            console.log('   Admin role data:', adminRole);
        }

        // Test 4: Test admin users listing query
        console.log('\n4️⃣ Testing admin users listing (Edge Function query)...');
        const { data: adminUsers, error: adminUsersError } = await supabase
            .from('user_roles')
            .select('user_id, created_at')
            .eq('role', 'admin')
            .order('created_at', { ascending: true });
        
        if (adminUsersError) {
            console.error('❌ Admin users listing error:', adminUsersError);
        } else {
            console.log('✅ Admin users listing successful');
            console.log('   Admin users data:', adminUsers);
        }

        // Test 5: Check if user_id column exists
        console.log('\n5️⃣ Checking for user_id column in user_roles...');
        try {
            const { data: userRolesWithUserId, error: userIdError } = await supabase
                .from('user_roles')
                .select('user_id')
                .limit(1);
            
            if (userIdError) {
                console.error('❌ user_id column query error:', userIdError);
            } else {
                console.log('✅ user_id column accessible');
                console.log('   user_id data:', userRolesWithUserId);
            }
        } catch (error) {
            console.error('❌ user_id column test failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testEdgeFunctionQueries();
