import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Test the exact webhook with your credentials
    const webhookUrl = 'YOUR_N8N_URL_HERE/webhook/send-order-to-pathao';
    const username = 'Nirob';
    const password = '8tSkjSCaVqem433L/077bd7';
    
    const credentials = btoa(`${username}:${password}`);
    
    const testPayload = {
      test: true,
      message: "Test from Supabase Edge Function",
      timestamp: new Date().toISOString()
    };

    console.log('Testing webhook:', webhookUrl);
    console.log('Using credentials:', username + ':' + password.substring(0, 5) + '...');
    console.log('Encoded credentials:', credentials);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Test-Function/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    let responseText;
    try {
      responseText = await response.text();
    } catch (e) {
      responseText = 'Could not read response';
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        headers: Object.fromEntries(response.headers.entries())
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Test error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})