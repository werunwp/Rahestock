// Test script to verify n8n webhook connectivity
const testWebhook = async () => {
  const webhookUrl = 'https://n8n.pronirob.com/webhook/send-order-to-pathao';
  const username = 'Nirob';
  const password = '8tSkjSCaVqem433L/077bd7';
  
  const credentials = btoa(`${username}:${password}`);
  
  const testPayload = {
    test: true,
    message: "Direct test from browser",
    timestamp: new Date().toISOString(),
    sale_id: "test-123",
    invoice_number: "TEST001",
    recipient_name: "Test Customer",
    recipient_phone: "01234567890",
    recipient_address: "Test Address",
    item_description: "Test Item",
    amount_to_collect: 100
  };

  try {
    console.log('Testing webhook:', webhookUrl);
    console.log('Using basic auth:', `${username}:${password.substring(0, 5)}...`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Direct-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log('Response Status:', response.status);
    console.log('Response Text:', responseText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };
    
  } catch (error) {
    console.error('Direct test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the test
testWebhook().then(result => {
  console.log('Final result:', result);
});