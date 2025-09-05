// Test script for courier webhook functionality
// This script tests the courier-status-update webhook endpoint

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/courier-status-update`;

// Test payloads for different scenarios
const testPayloads = [
  {
    name: 'Basic Status Update',
    payload: {
      consignment_id: 'TEST123',
      status: 'in_transit',
      current_location: 'Dhaka Hub',
      notes: 'Package picked up from warehouse'
    }
  },
  {
    name: 'Delivery Update',
    payload: {
      consignment_id: 'TEST123',
      status: 'delivered',
      delivery_date: new Date().toISOString(),
      courier_name: 'John Doe',
      courier_phone: '+8801234567890',
      notes: 'Package delivered successfully'
    }
  },
  {
    name: 'Return Update',
    payload: {
      consignment_id: 'TEST123',
      status: 'returned',
      return_reason: 'Customer not available',
      courier_notes: 'Attempted delivery at 2 PM, no response'
    }
  },
  {
    name: 'Location Update',
    payload: {
      consignment_id: 'TEST123',
      status: 'out_for_delivery',
      current_location: 'Gulshan-2, Dhaka',
      estimated_delivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      notes: 'Out for final delivery'
    }
  },
  {
    name: 'Courier Service Format (Array)',
    payload: {
      type: "success",
      code: 200,
      data: [
        {
          consignment_id: "DA230825JYCSQ4",
          invoice_id: null,
          merchant_order_id: "INV000004",
          order_status: "Pickup Cancel",
          order_status_slug: "Pickup_Cancelled",
          updated_at: "2025-08-23 12:34:12"
        }
      ]
    }
  },
  {
    name: 'Courier Service Format (Single Object)',
    payload: {
      type: "success",
      code: 200,
      data: {
        consignment_id: "DA230825JYCSQ4",
        invoice_id: null,
        merchant_order_id: "INV000004",
        order_status: "In Transit",
        order_status_slug: "In_Transit",
        updated_at: "2025-08-23 12:34:12"
      }
    }
  }
];

async function testWebhook(payload, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log(`📥 Response Status: ${response.status}`);
    console.log(`📥 Response Body:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Test PASSED');
    } else {
      console.log('❌ Test FAILED');
    }
    
    return { success: response.ok, status: response.status, result };
  } catch (error) {
    console.log('❌ Test FAILED with error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Courier Webhook Tests');
  console.log(`🎯 Target URL: ${WEBHOOK_URL}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of testPayloads) {
    const result = await testWebhook(test.payload, test.name);
    results.push({ test: test.name, ...result });
    
    // Wait between tests to avoid overwhelming the endpoint
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.test}: ${r.error || r.result?.message || 'Unknown error'}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check the Supabase dashboard for edge function logs');
  console.log('2. Verify that sales table was updated with new status');
  console.log('3. Check courier_status_logs table for audit trail');
  console.log('4. Test real-time updates in the UI');
}

// Check if running in Node.js environment
if (typeof fetch === 'undefined') {
  console.log('⚠️  This script requires Node.js 18+ or fetch polyfill');
  console.log('💡 Run with: node test_courier_webhook.js');
  process.exit(1);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWebhook, runTests };
