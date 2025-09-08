import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusCheckRequest {
  action: string;
  consignment_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Authorization optional: validate if present; otherwise proceed
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      console.log('Status-check auth result:', { user: !!user, error: authError?.message })
      // Continue even if auth fails; function uses service role for DB reads
    } else {
      console.log('No Authorization header provided for status-check; proceeding')
    }

    const requestData: StatusCheckRequest = await req.json()
    console.log('Processing status check request for consignment:', requestData.consignment_id);
    console.log('Raw request data:', JSON.stringify(requestData, null, 2));

    // Get courier webhook settings from database with explicit column selection
    const { data: webhookSettings, error: settingsError } = await supabaseClient
      .from('courier_webhook_settings')
      .select('id, webhook_url, status_check_webhook_url, webhook_name, webhook_description, is_active, auth_username, auth_password')
      .eq('is_active', true)
      .maybeSingle()

    console.log('Webhook settings query result:', { 
      hasData: !!webhookSettings, 
      error: settingsError?.message,
      settingsFound: webhookSettings ? {
        id: webhookSettings.id,
        url: webhookSettings.webhook_url,
        hasUsername: !!webhookSettings.auth_username,
        hasPassword: !!webhookSettings.auth_password
      } : null
    });

    if (settingsError) {
      console.error('Database error fetching webhook settings:', settingsError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database error: ' + settingsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!webhookSettings) {
      console.error('No active webhook settings found');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Courier webhook settings not configured or disabled',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const statusCheckUrl = webhookSettings.status_check_webhook_url || webhookSettings.webhook_url;
    if (!statusCheckUrl) {
      console.error('No status_check_webhook_url or webhook_url configured');
      return new Response(
        JSON.stringify({ success: false, message: 'No status check URL configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Checking status with webhook URL:', statusCheckUrl);

    // Prepare headers for webhook request
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Courier-Status-Checker/1.0',
      'Accept': 'application/json'
    };

    // Add basic auth if configured
    if (webhookSettings.auth_username && webhookSettings.auth_password) {
      const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
      webhookHeaders['Authorization'] = `Basic ${credentials}`;
      console.log('Added basic auth credentials for status check');
    }

    // Send status check request to the configured webhook
    // Build URL with only consignment_id parameter
    const url = new URL(statusCheckUrl);
    url.searchParams.append('consignment_id', requestData.consignment_id);

    console.log('Sending request to:', url.toString());
    // Request headers logged for debugging (no sensitive data exposed)
    if (process.env.NODE_ENV === 'development') {
      console.log('Request headers:', Object.keys(webhookHeaders));
    }
    console.log('Request parameters:', {
      consignment_id: requestData.consignment_id
    });

    // First attempt: GET with query param
    let webhookResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Courier-Status-Checker/1.0',
        ...(webhookHeaders.Authorization && { 'Authorization': webhookHeaders.Authorization })
      },
    })

    let webhookResult: any;
    try {
      webhookResult = await webhookResponse.json()
    } catch (e) {
      webhookResult = await webhookResponse.text()
    }

    console.log('GET status check response status:', webhookResponse.status);
    console.log('GET status check response:', webhookResult);

    // If GET failed (4xx/5xx), try POST with JSON body as fallback (some n8n setups expect POST)
    if (!webhookResponse.ok) {
      console.log('GET failed, attempting POST fallback...');
      try {
        webhookResponse = await fetch(statusCheckUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Courier-Status-Checker/1.0',
            ...(webhookHeaders.Authorization && { 'Authorization': webhookHeaders.Authorization })
          },
          body: JSON.stringify({ consignment_id: requestData.consignment_id })
        })
        try {
          webhookResult = await webhookResponse.json()
        } catch (_e) {
          webhookResult = await webhookResponse.text()
        }
        console.log('POST status check response status:', webhookResponse.status);
        console.log('POST status check response:', webhookResult);
      } catch (postErr) {
        console.error('POST fallback error:', postErr);
      }
    }

    if (!webhookResponse.ok) {
      console.error('Status Check Error Response:', webhookResult)
      
      // Check for specific n8n webhook configuration issues
      if (webhookResponse.status === 404 && webhookResult?.message?.includes('not registered for POST requests')) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'n8n Webhook Configuration Error: Your webhook is not configured to accept POST requests. Please update your n8n webhook node to accept POST method.',
            error: { 
              status: webhookResponse.status, 
              body: webhookResult,
              fix: 'In your n8n webhook node, set HTTP Method to "POST" or "All" under Options > Allowed Methods'
            }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Status Check Error (${webhookResponse.status}): Failed to check order status`,
          error: { status: webhookResponse.status, body: webhookResult }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status check completed successfully',
        webhook_response: webhookResult,
        webhook_name: webhookSettings.webhook_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in courier-status-check function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: (error as any)?.message || 'Internal server error',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})