// Test App Queries After RLS Fix
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supabase.akhiyanbd.com';
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NTc3OTgyMCwiZXhwIjo0OTExNDUzNDIwLCJyb2xlIjoiYW5vbiJ9.5CgjASpcB28n4UP1nrKmAP6_ODBJwpjgKy7_yhQZBxc';

async function testAfterFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('🧪 Testing app startup queries after RLS policy fix...\n');
  
  const startTime = Date.now();
  
  try {
    // Test 1: Auth (should be fast)
    console.log('1️⃣ Testing auth...');
    const authStart = Date.now();
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`✅ Auth: ${Date.now() - authStart}ms`);
    
    // Test 2: Profiles (was infinite recursion before)
    console.log('2️⃣ Testing profiles...');
    const profileStart = Date.now();
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1);
    console.log(`${profileError ? '❌' : '✅'} Profiles: ${Date.now() - profileStart}ms ${profileError ? '- ' + profileError.message : ''}`);
    
    // Test 3: User roles (was infinite recursion before)
    console.log('3️⃣ Testing user_roles...');
    const rolesStart = Date.now();
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id, role')
      .limit(1);
    console.log(`${rolesError ? '❌' : '✅'} User roles: ${Date.now() - rolesStart}ms ${rolesError ? '- ' + rolesError.message : ''}`);
    
    // Test 4: Products (using correct column names)
    console.log('4️⃣ Testing products...');
    const productsStart = Date.now();
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, rate, stock_quantity')  // Using correct column names
      .limit(10);
    console.log(`${productsError ? '❌' : '✅'} Products: ${Date.now() - productsStart}ms ${productsError ? '- ' + productsError.message : ''}`);
    
    // Test 5: Sales (using correct column names)
    console.log('5️⃣ Testing sales...');
    const salesStart = Date.now();
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, invoice_number, grand_total, created_at')  // Using correct column names
      .limit(10);
    console.log(`${salesError ? '❌' : '✅'} Sales: ${Date.now() - salesStart}ms ${salesError ? '- ' + salesError.message : ''}`);
    
    // Test 6: Customers (without email for now)
    console.log('6️⃣ Testing customers...');
    const customersStart = Date.now();
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, phone, total_spent')  // Using existing columns
      .limit(10);
    console.log(`${customersError ? '❌' : '✅'} Customers: ${Date.now() - customersStart}ms ${customersError ? '- ' + customersError.message : ''}`);
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n📊 Performance Summary:');
    console.log(`Total time: ${totalTime}ms`);
    
    if (totalTime < 1000) {
      console.log('🚀 EXCELLENT: App should load quickly now!');
    } else if (totalTime < 2000) {
      console.log('👍 GOOD: Much better performance expected');
    } else {
      console.log('⚠️ SLOW: Still some optimization needed');
    }
    
    console.log('\n🎯 Ready to test the actual app!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAfterFix().catch(console.error);
