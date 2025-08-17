import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing authorization header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Set auth context
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Unauthorized: ' + (authError?.message || 'Invalid user'),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Debug webhook test started');

    // Get current webhook settings
    const { data: webhookSettings, error: settingsError } = await supabaseClient
      .from('courier_webhook_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (settingsError || !webhookSettings) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No webhook settings found',
          error: settingsError?.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Current webhook settings:', {
      url: webhookSettings.webhook_url,
      name: webhookSettings.webhook_name,
      hasAuth: !!(webhookSettings.auth_username && webhookSettings.auth_password)
    });

    // Test the webhook with different methods
    const testResults = [];

    // Test 1: POST request (what we normally use)
    console.log('Testing POST request...');
    try {
      const postHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Test/1.0',
        'Accept': 'application/json'
      };

      if (webhookSettings.auth_username && webhookSettings.auth_password) {
        const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
        postHeaders['Authorization'] = `Basic ${credentials}`;
      }

      const postResponse = await fetch(webhookSettings.webhook_url, {
        method: 'POST',
        headers: postHeaders,
        body: JSON.stringify({
          test: true,
          method: 'POST',
          timestamp: new Date().toISOString()
        }),
      });

      let postResult;
      try {
        postResult = await postResponse.text();
      } catch (e) {
        postResult = 'Could not read response';
      }

      testResults.push({
        method: 'POST',
        status: postResponse.status,
        ok: postResponse.ok,
        response: postResult,
        headers: Object.fromEntries(postResponse.headers.entries())
      });

      console.log('POST test result:', {
        status: postResponse.status,
        ok: postResponse.ok,
        response: postResult.substring(0, 200) + (postResult.length > 200 ? '...' : '')
      });

    } catch (error) {
      testResults.push({
        method: 'POST',
        error: error.message
      });
      console.log('POST test error:', error.message);
    }

    // Test 2: GET request
    console.log('Testing GET request...');
    try {
      const getHeaders: Record<string, string> = {
        'User-Agent': 'Debug-Test/1.0',
        'Accept': 'application/json'
      };

      if (webhookSettings.auth_username && webhookSettings.auth_password) {
        const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
        getHeaders['Authorization'] = `Basic ${credentials}`;
      }

      const getResponse = await fetch(webhookSettings.webhook_url, {
        method: 'GET',
        headers: getHeaders,
      });

      let getResult;
      try {
        getResult = await getResponse.text();
      } catch (e) {
        getResult = 'Could not read response';
      }

      testResults.push({
        method: 'GET',
        status: getResponse.status,
        ok: getResponse.ok,
        response: getResult,
        headers: Object.fromEntries(getResponse.headers.entries())
      });

      console.log('GET test result:', {
        status: getResponse.status,
        ok: getResponse.ok,
        response: getResult.substring(0, 200) + (getResult.length > 200 ? '...' : '')
      });

    } catch (error) {
      testResults.push({
        method: 'GET',
        error: error.message
      });
      console.log('GET test error:', error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Debug tests completed',
        webhook_settings: {
          url: webhookSettings.webhook_url,
          name: webhookSettings.webhook_name,
          description: webhookSettings.webhook_description,
          has_auth: !!(webhookSettings.auth_username && webhookSettings.auth_password)
        },
        test_results: testResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in debug-webhook function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})