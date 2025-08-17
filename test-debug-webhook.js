// Debug webhook test - paste this in browser console
const debugWebhook = async () => {
  try {
    console.log('Starting webhook debug test...');
    
    const token = localStorage.getItem('sb-fbpzvcixoocdtzqvtwfr-auth-token');
    let authToken = '';
    
    if (token) {
      const authData = JSON.parse(token);
      authToken = authData.access_token;
    }
    
    if (!authToken) {
      console.error('No auth token found. Please make sure you are logged in.');
      return;
    }
    
    const response = await fetch('https://fbpzvcixoocdtzqvtwfr.supabase.co/functions/v1/debug-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicHp2Y2l4b29jZHR6cXZ0d2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNTkzNTUsImV4cCI6MjA2ODczNTM1NX0.g_RCJill8N9I_19sanPLob7gDdjp1TjxzeKvZCJCxl4'
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    
    console.log('Debug test response status:', response.status);
    console.log('Debug test response:', result);
    
    if (result.test_results) {
      result.test_results.forEach((test, index) => {
        console.log(`Test ${index + 1} (${test.method}):`, test);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('Debug test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the debug test
debugWebhook();